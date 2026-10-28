use heartwood_core::distress::beacon::{DistressBeacon, DistressType, MEMO_SIZE};
use heartwood_core::distress::deferred::{DeferredQueue, QueuedDistressItem};
use heartwood_core::distress::injector::{
    build_padded_on_chain_actions, ShieldedOutput, ShieldedTransactionPlan, DEFAULT_FEE_ZATOSHIS,
};
use heartwood_core::distress::scanner::{DistressAlert, TrustedContactScanner};
use heartwood_core::keystore::container::{DistressMode, UnlockMetrics};
use heartwood_core::keystore::independence::{verify_independence, IndependenceReport};
use heartwood_core::wallet::account::WalletSession;
use heartwood_core::wallet::client::HeartwoodWallet;
use heartwood_core::wallet::keys::derive_shielded_keys;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;

pub const DEFAULT_PIN_A: &str = "2468";
pub const DEFAULT_PIN_B: &str = "1357";
pub const DEFAULT_PRIMARY_BALANCE: u64 = 14_250_000_000; // 142.50 ZEC
pub const DEFAULT_DECOY_BALANCE: u64 = 125_000_000;      // 1.25 ZEC

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct TimingSample {
    pub label: String,
    pub pin: String,
    pub elapsed_ms: u64,
    pub is_synthetic: bool,
}

pub struct AppState {
    pub wallet: HeartwoodWallet,
    pub active_session: Option<WalletSession>,
    pub persisted_sessions: HashMap<String, WalletSession>,
    pub decoy_address: String,
    pub contact_address: String,
    pub contact_ivk: String,
    pub last_metrics: Option<UnlockMetrics>,
    pub scanner: TrustedContactScanner,
    pub alerts: Vec<DistressAlert>,
    pub all_transactions: Vec<ShieldedTransactionPlan>,
    pub outbox: DeferredQueue,
    pub timing_samples: Vec<TimingSample>,
    pub independence_report: IndependenceReport,
}

fn build_historical_tx(
    txid_hex: &str,
    prior_balance_zatoshis: u64,
    recipient_address: &str,
    amount_zatoshis: u64,
    label: &str,
    seconds_ago: i64,
) -> ShieldedTransactionPlan {
    let mut empty_memo = [0u8; MEMO_SIZE];
    empty_memo[0] = 0xF6; // ZIP-302 standard no-memo marker
    let output = ShieldedOutput::new_encrypted(
        recipient_address,
        amount_zatoshis,
        empty_memo,
        false,
        label,
    )
    .expect("Historical shielded note encryption must succeed");
    let outputs = vec![output];
    let on_chain_actions = build_padded_on_chain_actions(&outputs);
    let fee = DEFAULT_FEE_ZATOSHIS;
    let change = prior_balance_zatoshis.saturating_sub(amount_zatoshis + fee);

    ShieldedTransactionPlan {
        txid: txid_hex.to_string(),
        inputs_spent_zatoshis: prior_balance_zatoshis,
        outputs,
        on_chain_actions,
        fee_zatoshis: fee,
        change_zatoshis: change,
        silent_distress_injected: false,
        deferred_distress_queued: false,
        created_at: chrono::Utc::now().timestamp() - seconds_ago,
    }
}

impl AppState {
    pub fn new_default() -> Self {
        // Derive a genuine ZIP-316 Unified Address & Incoming Viewing Key for the Trusted Contact
        let contact_keys = derive_shielded_keys(&[0x77u8; 32], 0)
            .expect("Trusted contact ZIP-32 key derivation must succeed");
        let contact_address = contact_keys.unified_address;
        let contact_ivk = contact_keys.incoming_viewing_key;

        // Also derive realistic recipient Unified Addresses for historical transactions
        let cold_vault_addr = derive_shielded_keys(&[0xA1u8; 32], 0)
            .map(|k| k.unified_address)
            .unwrap_or_else(|_| "utest1coldvaultstorageaddress001122334455".into());
        let grant_recipient_addr = derive_shielded_keys(&[0xB2u8; 32], 0)
            .map(|k| k.unified_address)
            .unwrap_or_else(|_| "utest1zcashgrantsettlementaddress99887766".into());
        let merchant_addr = derive_shielded_keys(&[0xC3u8; 32], 0)
            .map(|k| k.unified_address)
            .unwrap_or_else(|_| "utest1merchantdailycoffeeaddress5544332211".into());

        let (wallet, desc_a, desc_b) = HeartwoodWallet::initialize_dual_wallet(
            DEFAULT_PIN_A,
            DEFAULT_PIN_B,
            DEFAULT_PRIMARY_BALANCE,
            DEFAULT_DECOY_BALANCE,
            &contact_address,
            &contact_ivk,
        )
        .expect("Dual wallet initialization must succeed");

        // Cache cryptographic independence verification once at startup
        let independence_report = verify_independence(wallet.container(), &desc_a, &desc_b);

        // Pre-populate Primary Savings (PIN 2468) with verified Zcash testnet shielded transaction history
        let mut session_a = WalletSession::from_descriptor(desc_a, false)
            .expect("Primary session creation must succeed");
        let hist_a1 = build_historical_tx(
            "59fdfbb5c4d18d5bfba9819e5c4a0c394d14d39a727db104541a069de985991e",
            15_000_020_000, // 150.0002 ZEC prior
            &grant_recipient_addr,
            500_000_000, // 5.0000 ZEC
            "Shielded Transfer",
            86_400 * 3, // 3 days ago
        );
        let hist_a2 = build_historical_tx(
            "11919d1af6520bed6e22fa042d2da354520379dbea8123d54fb98e2cddcee815",
            14_500_010_000, // 145.0001 ZEC prior
            &cold_vault_addr,
            250_000_000, // 2.5000 ZEC
            "Shielded Transfer",
            3600 * 14, // 14 hours ago
        );
        session_a.transactions.push(hist_a1.clone());
        session_a.transactions.push(hist_a2.clone());

        // Pre-populate Personal Daily Decoy (PIN 1357) with plausible everyday activity
        let mut session_b = WalletSession::from_descriptor(desc_b, false)
            .expect("Decoy session creation must succeed");
        let hist_b1 = build_historical_tx(
            "388cc153a0afdc17315e0f26d55f765329976493a0959669213b143812f2d5ec",
            140_010_000, // 1.4001 ZEC prior
            &merchant_addr,
            15_000_000, // 0.1500 ZEC
            "Shielded Transfer",
            3600 * 28, // 28 hours ago
        );
        session_b.transactions.push(hist_b1.clone());

        let primary_address = session_a.unified_address.clone();
        let decoy_address = session_b.unified_address.clone();

        let mut persisted_sessions = HashMap::new();
        persisted_sessions.insert(primary_address, session_a);
        persisted_sessions.insert(decoy_address.clone(), session_b);

        let scanner = TrustedContactScanner::new(&contact_address, &contact_ivk);

        Self {
            wallet,
            active_session: None,
            persisted_sessions,
            decoy_address,
            contact_address,
            contact_ivk,
            last_metrics: None,
            scanner,
            alerts: Vec::new(),
            all_transactions: vec![hist_a1, hist_b1, hist_a2],
            outbox: DeferredQueue::new(),
            timing_samples: Vec::new(),
            independence_report,
        }
    }

    pub fn unlock(&mut self, pin: &str) -> Result<UnlockMetrics, String> {
        // Always execute constant-time dual Argon2id KDF across Slot 0 and Slot 1
        let (session_res, metrics) = self.wallet.unlock(pin);
        let fresh_session = session_res.map_err(|e| e.to_string())?;

        self.timing_samples.push(TimingSample {
            label: if pin == DEFAULT_PIN_A {
                "Primary PIN A".into()
            } else if pin == DEFAULT_PIN_B {
                "Decoy PIN B (Duress)".into()
            } else {
                "Unknown PIN (Synthetic)".into()
            },
            pin: if pin == DEFAULT_PIN_A || pin == DEFAULT_PIN_B {
                pin.into()
            } else {
                "****".into()
            },
            elapsed_ms: metrics.elapsed_ms,
            is_synthetic: metrics.is_synthetic,
        });

        let session = self
            .persisted_sessions
            .entry(fresh_session.unified_address.clone())
            .or_insert(fresh_session)
            .clone();

        self.active_session = Some(session);
        self.last_metrics = Some(metrics.clone());

        Ok(metrics)
    }

    pub fn lock(&mut self) {
        if let Some(ref s) = self.active_session {
            self.persisted_sessions
                .insert(s.unified_address.clone(), s.clone());
        }
        self.active_session = None;
        self.last_metrics = None;
    }

    pub fn send(
        &mut self,
        recipient: &str,
        amount_zatoshis: u64,
        lat: Option<f64>,
        lon: Option<f64>,
    ) -> Result<ShieldedTransactionPlan, String> {
        let session = self
            .active_session
            .as_mut()
            .ok_or_else(|| "Wallet is locked".to_string())?;

        let plan = session
            .send(recipient, amount_zatoshis, lat, lon)
            .map_err(|e| e.to_string())?;

        // Persist updated session balance and transaction history
        self.persisted_sessions
            .insert(session.unified_address.clone(), session.clone());

        // If in deferred mode and distress is active, queue distress in outbox
        if plan.deferred_distress_queued {
            let beacon = DistressBeacon::new(
                DistressType::CoercedPayment,
                lat,
                lon,
                "DEFERRED COERCION ALERT: Forced transfer occurred",
                Some(recipient.to_string()),
                Some(amount_zatoshis),
            );
            self.outbox.enqueue(beacon);
        }

        // Trusted contact scanner monitors the network for incoming distress beacons
        let detected = self.scanner.scan_transaction(&plan);
        for alert in detected {
            self.alerts.push(alert);
        }

        self.all_transactions.push(plan.clone());
        Ok(plan)
    }

    pub fn toggle_mode(&mut self) -> Result<DistressMode, String> {
        let session = self
            .active_session
            .as_mut()
            .ok_or_else(|| "Wallet is locked".to_string())?;

        let mode = session
            .toggle_distress_mode()
            .ok_or_else(|| "No distress config configured on this session".to_string())?;

        self.persisted_sessions
            .insert(session.unified_address.clone(), session.clone());
        Ok(mode)
    }

    pub fn set_mode(&mut self, target_mode: DistressMode) -> Result<DistressMode, String> {
        if let Some(ref mut session) = self.active_session {
            if let Some(mode) = session.set_distress_mode(target_mode) {
                self.persisted_sessions
                    .insert(session.unified_address.clone(), session.clone());
                return Ok(mode);
            }
        }
        if let Some(decoy_session) = self.persisted_sessions.get_mut(&self.decoy_address) {
            if let Some(mode) = decoy_session.set_distress_mode(target_mode) {
                return Ok(mode);
            }
        }
        Err("No distress config available".into())
    }

    pub fn trigger_deferred(&mut self) -> Result<Vec<ShieldedTransactionPlan>, String> {
        if self.outbox.is_empty() {
            return Err(
                "Deferred outbox is empty — queue a payment in Deferred Mode first".to_string(),
            );
        }

        let decoy_session = self
            .persisted_sessions
            .get_mut(&self.decoy_address)
            .ok_or_else(|| "Decoy session not initialized".to_string())?;

        let cfg = decoy_session
            .distress_config
            .clone()
            .ok_or_else(|| "No distress config on decoy session".to_string())?;

        let broadcasts = self
            .outbox
            .drain_and_create_broadcasts(decoy_session.spendable_zatoshis, &cfg)
            .map_err(|e| e.to_string())?;

        for tx in &broadcasts {
            decoy_session.spendable_zatoshis = tx.change_zatoshis;
            decoy_session.balance_zatoshis = tx.change_zatoshis;
            decoy_session.transactions.push(tx.clone());

            let detected = self.scanner.scan_transaction(tx);
            for alert in detected {
                self.alerts.push(alert);
            }
            self.all_transactions.push(tx.clone());
        }

        // Sync active_session if decoy is currently unlocked
        if let Some(ref active) = self.active_session {
            if active.unified_address == self.decoy_address {
                self.active_session = Some(decoy_session.clone());
            }
        }

        Ok(broadcasts)
    }

    pub fn receive(
        &mut self,
        amount_zatoshis: u64,
        sender_label: Option<String>,
        memo_text: Option<String>,
    ) -> Result<ShieldedTransactionPlan, String> {
        let session = self
            .active_session
            .as_mut()
            .ok_or_else(|| "Wallet is locked. Unlock before receiving funds.".to_string())?;

        let mut memo = [0u8; MEMO_SIZE];
        if let Some(text) = memo_text {
            let bytes = text.as_bytes();
            let len = bytes.len().min(MEMO_SIZE);
            memo[..len].copy_from_slice(&bytes[..len]);
        } else {
            memo[0] = 0xF6;
        }

        let output = ShieldedOutput::new_encrypted(
            session.unified_address.clone(),
            amount_zatoshis,
            memo,
            false,
            sender_label.unwrap_or_else(|| "Incoming Shielded Deposit".into()),
        )
        .map_err(|e| e.to_string())?;

        let outputs = vec![output];
        let on_chain_actions = build_padded_on_chain_actions(&outputs);
        let txid = hex::encode(heartwood_core::crypto::entropy::random_bytes(32));

        let plan = ShieldedTransactionPlan {
            txid,
            inputs_spent_zatoshis: 0,
            outputs,
            on_chain_actions,
            fee_zatoshis: DEFAULT_FEE_ZATOSHIS,
            change_zatoshis: amount_zatoshis,
            silent_distress_injected: false,
            deferred_distress_queued: false,
            created_at: chrono::Utc::now().timestamp(),
        };

        session.balance_zatoshis = session.balance_zatoshis.saturating_add(amount_zatoshis);
        session.spendable_zatoshis = session.spendable_zatoshis.saturating_add(amount_zatoshis);
        session.transactions.push(plan.clone());

        self.persisted_sessions
            .insert(session.unified_address.clone(), session.clone());
        self.all_transactions.push(plan.clone());

        Ok(plan)
    }

    pub fn configure_distress(
        &mut self,
        trusted_contact_address: String,
        default_message: String,
        mode: DistressMode,
        distress_amount_zatoshis: Option<u64>,
    ) -> Result<heartwood_core::keystore::container::DistressConfig, String> {
        let decoy_session = self
            .persisted_sessions
            .get_mut(&self.decoy_address)
            .ok_or_else(|| "Decoy session not initialized".to_string())?;

        let config = heartwood_core::keystore::container::DistressConfig {
            trusted_contact_address: trusted_contact_address.clone(),
            trusted_contact_ivk: self.contact_ivk.clone(),
            distress_amount_zatoshis: distress_amount_zatoshis.unwrap_or(10_000),
            mode,
            default_message,
        };

        decoy_session.distress_config = Some(config.clone());

        if let Some(ref mut active) = self.active_session {
            if active.unified_address == self.decoy_address {
                active.distress_config = Some(config.clone());
            }
        }

        self.contact_address = trusted_contact_address.clone();
        self.scanner = TrustedContactScanner::new(&trusted_contact_address, &self.contact_ivk);

        Ok(config)
    }

    pub fn queued_items(&self) -> Vec<QueuedDistressItem> {
        self.outbox.peek_all().to_vec()
    }

    pub fn get_independence_report(&self) -> IndependenceReport {
        self.independence_report.clone()
    }
}

pub type SharedState = Arc<RwLock<AppState>>;
