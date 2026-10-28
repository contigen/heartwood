use crate::distress::injector::{plan_transaction, ShieldedTransactionPlan};
use crate::error::Result;
use crate::keystore::container::{DistressConfig, DistressMode, VolumeDescriptor};
use crate::wallet::keys::derive_shielded_keys;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct WalletSession {
    pub account_name: String,
    pub unified_address: String,
    pub incoming_viewing_key: String,
    pub balance_zatoshis: u64,
    pub spendable_zatoshis: u64,
    pub transactions: Vec<ShieldedTransactionPlan>,
    pub distress_config: Option<DistressConfig>,
    pub is_synthetic: bool,
    pub mnemonic: String,
}

impl WalletSession {
    /// Creates a wallet session from a decrypted volume descriptor.
    pub fn from_descriptor(desc: VolumeDescriptor, is_synthetic: bool) -> Result<Self> {
        let keys = derive_shielded_keys(&desc.seed, 0)?;

        let balance = desc.initial_balance_zatoshis;
        Ok(Self {
            account_name: desc.account_name.clone(),
            unified_address: keys.unified_address,
            incoming_viewing_key: keys.incoming_viewing_key,
            balance_zatoshis: balance,
            spendable_zatoshis: balance,
            transactions: Vec::new(),
            distress_config: desc.distress_config.clone(),
            is_synthetic,
            mnemonic: desc.mnemonic.clone(),
        })
    }

    /// Sends a payment. If distress is configured, automatically injects the silent distress output.
    pub fn send(
        &mut self,
        recipient: &str,
        amount_zatoshis: u64,
        lat: Option<f64>,
        lon: Option<f64>,
    ) -> Result<ShieldedTransactionPlan> {
        let plan = plan_transaction(
            self.spendable_zatoshis,
            recipient,
            amount_zatoshis,
            self.distress_config.as_ref(),
            lat,
            lon,
        )?;

        // Update balance
        let _total_deducted = plan.inputs_spent_zatoshis - plan.change_zatoshis;
        self.spendable_zatoshis = plan.change_zatoshis;
        self.balance_zatoshis = plan.change_zatoshis;

        self.transactions.push(plan.clone());
        Ok(plan)
    }

    /// Toggles the distress beacon mode between Immediate and Deferred (for decoy identity).
    pub fn toggle_distress_mode(&mut self) -> Option<DistressMode> {
        if let Some(ref mut cfg) = self.distress_config {
            cfg.mode = match cfg.mode {
                DistressMode::Immediate => DistressMode::Deferred,
                DistressMode::Deferred => DistressMode::Immediate,
            };
            Some(cfg.mode)
        } else {
            None
        }
    }

    /// Explicitly sets the distress beacon mode (Immediate or Deferred).
    pub fn set_distress_mode(&mut self, mode: DistressMode) -> Option<DistressMode> {
        if let Some(ref mut cfg) = self.distress_config {
            cfg.mode = mode;
            Some(cfg.mode)
        } else {
            None
        }
    }

    /// Checks whether this session has an active covert distress mechanism configured.
    pub fn has_distress_config(&self) -> bool {
        self.distress_config.is_some()
    }
}
