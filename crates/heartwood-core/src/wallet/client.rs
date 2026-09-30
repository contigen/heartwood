use crate::crypto::entropy;
use crate::error::Result;
use crate::keystore::container::{
    Container, DistressConfig, DistressMode, UnlockMetrics, VolumeDescriptor,
};
use crate::wallet::account::WalletSession;
use bip39::Mnemonic;
use std::path::Path;

pub struct HeartwoodWallet {
    container: Container,
}

impl HeartwoodWallet {
    pub fn new(container: Container) -> Self {
        Self { container }
    }

    /// Initializes a new dual-identity container with Seed A (Primary) and Seed B (Decoy with Distress).
    pub fn initialize_dual_wallet(
        pin_primary: &str,
        pin_decoy: &str,
        primary_balance_zatoshis: u64,
        decoy_balance_zatoshis: u64,
        trusted_contact_address: &str,
        trusted_contact_ivk: &str,
    ) -> Result<(Self, VolumeDescriptor, VolumeDescriptor)> {
        let mut container = Container::new();

        // 1. Generate independent BIP-39 mnemonic & seed for Primary Volume (Seed A)
        let mut entropy_a = [0u8; 16];
        entropy::fill_random(&mut entropy_a);
        let mnemonic_a = Mnemonic::from_entropy(&entropy_a)
            .map_err(|e| crate::error::HeartwoodError::KeyDerivation(format!("{e}")))?;
        let seed_a = mnemonic_a.to_seed("");
        let mut seed_a_32 = [0u8; 32];
        seed_a_32.copy_from_slice(&seed_a[0..32]);

        let desc_a = VolumeDescriptor {
            seed: seed_a_32,
            mnemonic: mnemonic_a.to_string(),
            account_name: "Primary Savings".into(),
            created_at: chrono::Utc::now().timestamp(),
            initial_balance_zatoshis: primary_balance_zatoshis,
            distress_config: None, // Real account has no distress mechanism
        };
        container.set_slot_0(pin_primary, &desc_a)?;

        // 2. Generate fully independent BIP-39 mnemonic & seed for Decoy Volume (Seed B)
        let mut entropy_b = [0u8; 16];
        entropy::fill_random(&mut entropy_b);
        let mnemonic_b = Mnemonic::from_entropy(&entropy_b)
            .map_err(|e| crate::error::HeartwoodError::KeyDerivation(format!("{e}")))?;
        let seed_b = mnemonic_b.to_seed("");
        let mut seed_b_32 = [0u8; 32];
        seed_b_32.copy_from_slice(&seed_b[0..32]);

        let distress_config = DistressConfig {
            trusted_contact_address: trusted_contact_address.to_string(),
            trusted_contact_ivk: trusted_contact_ivk.to_string(),
            distress_amount_zatoshis: 10_000, // 0.0001 ZEC
            mode: DistressMode::Immediate,
            default_message: "COERCION ALERT: Forced transfer executed on device".into(),
        };

        let desc_b = VolumeDescriptor {
            seed: seed_b_32,
            mnemonic: mnemonic_b.to_string(),
            account_name: "Personal Daily".into(), // Decoy name looks completely ordinary
            created_at: chrono::Utc::now().timestamp(),
            initial_balance_zatoshis: decoy_balance_zatoshis,
            distress_config: Some(distress_config),
        };
        container.set_slot_1(pin_decoy, &desc_b)?;

        Ok((Self { container }, desc_a, desc_b))
    }

    /// Loads container from file.
    pub fn load_from_file<P: AsRef<Path>>(path: P) -> Result<Self> {
        let container = Container::load_from_file(path)?;
        Ok(Self { container })
    }

    /// Saves container to file.
    pub fn save_to_file<P: AsRef<Path>>(&self, path: P) -> Result<()> {
        self.container.save_to_file(path)
    }

    /// Returns container reference for diagnostics / entropy analysis.
    pub fn container(&self) -> &Container {
        &self.container
    }

    /// Performs the constant-time identical unlock flow.
    pub fn unlock(&self, pin: &str) -> (Result<WalletSession>, UnlockMetrics) {
        let (desc, metrics) = self.container.unlock(pin);
        let session = WalletSession::from_descriptor(desc, metrics.is_synthetic);
        (session, metrics)
    }
}
