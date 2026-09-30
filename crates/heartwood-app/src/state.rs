use heartwood_core::distress::beacon::{DistressBeacon, DistressType};
use heartwood_core::distress::deferred::DeferredQueue;
use heartwood_core::distress::injector::ShieldedTransactionPlan;
use heartwood_core::distress::scanner::{DistressAlert, TrustedContactScanner};
use heartwood_core::keystore::container::{DistressMode, UnlockMetrics};
use heartwood_core::keystore::independence::{verify_independence, IndependenceReport};
use heartwood_core::wallet::account::WalletSession;
use heartwood_core::wallet::client::HeartwoodWallet;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::RwLock;

pub const DEFAULT_PIN_A: &str = "2468";
pub const DEFAULT_PIN_B: &str = "1357";
pub const DEFAULT_PRIMARY_BALANCE: u64 = 14_250_000_000; // 142.50 ZEC
pub const DEFAULT_DECOY_BALANCE: u64 = 125_000_000;      // 1.25 ZEC
pub const DEFAULT_CONTACT_ADDR: &str = "utest1hwoodtrustedcontactemergencycenter7766554433221100";
pub const DEFAULT_CONTACT_IVK: &str = "zviewtestsaplingemergencyivk7766554433221100aabbcc";

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
    pub last_metrics: Option<UnlockMetrics>,
    pub scanner: TrustedContactScanner,
    pub alerts: Vec<DistressAlert>,
    pub all_transactions: Vec<ShieldedTransactionPlan>,
    pub outbox: DeferredQueue,
    pub timing_samples: Vec<TimingSample>,
}

impl AppState {
    pub fn new_default() -> Self {
        let (wallet, _, _) = HeartwoodWallet::initialize_dual_wallet(
            DEFAULT_PIN_A,
            DEFAULT_PIN_B,
            DEFAULT_PRIMARY_BALANCE,
            DEFAULT_DECOY_BALANCE,
            DEFAULT_CONTACT_ADDR,
            DEFAULT_CONTACT_IVK,
        )
        .expect("Dual wallet initialization must succeed");

        let scanner = TrustedContactScanner::new(DEFAULT_CONTACT_ADDR, DEFAULT_CONTACT_IVK);

        Self {
            wallet,
            active_session: None,
            last_metrics: None,
            scanner,
            alerts: Vec::new(),
            all_transactions: Vec::new(),
            outbox: DeferredQueue::new(),
            timing_samples: Vec::new(),
        }
    }

    pub fn unlock(&mut self, pin: &str) -> Result<UnlockMetrics, String> {
        let (session_res, metrics) = self.wallet.unlock(pin);
        let session = session_res.map_err(|e| e.to_string())?;

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

        self.active_session = Some(session);
        self.last_metrics = Some(metrics.clone());

        Ok(metrics)
    }

    pub fn lock(&mut self) {
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

        session
            .toggle_distress_mode()
            .ok_or_else(|| "No distress config configured on this session".to_string())
    }

    pub fn trigger_deferred(&mut self) -> Result<Vec<ShieldedTransactionPlan>, String> {
        let session = self
            .active_session
            .as_ref()
            .ok_or_else(|| "Wallet is locked".to_string())?;

        let cfg = session
            .distress_config
            .as_ref()
            .ok_or_else(|| "No distress config on active session".to_string())?;

        let broadcasts = self
            .outbox
            .drain_and_create_broadcasts(session.spendable_zatoshis, cfg)
            .map_err(|e| e.to_string())?;

        for tx in &broadcasts {
            let detected = self.scanner.scan_transaction(tx);
            for alert in detected {
                self.alerts.push(alert);
            }
            self.all_transactions.push(tx.clone());
        }

        Ok(broadcasts)
    }

    pub fn get_independence_report(&self) -> IndependenceReport {
        let (desc_a, _) = self.wallet.container().unlock(DEFAULT_PIN_A);
        let (desc_b, _) = self.wallet.container().unlock(DEFAULT_PIN_B);
        verify_independence(self.wallet.container(), &desc_a, &desc_b)
    }
}

pub type SharedState = Arc<RwLock<AppState>>;
