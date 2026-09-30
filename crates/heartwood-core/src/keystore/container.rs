use crate::crypto::{aead, entropy, kdf};
use crate::error::{HeartwoodError, Result};
use serde::{Deserialize, Serialize};
use std::path::Path;
use std::time::Instant;
use zeroize::{Zeroize, ZeroizeOnDrop};

/// Container total size: 64 KiB (65,536 bytes).
pub const CONTAINER_SIZE: usize = 64 * 1024;

/// Each slot header is exactly 1024 bytes:
/// - 32 bytes: Salt
/// - 992 bytes: AEAD Ciphertext (976 bytes padded plaintext + 16 bytes Poly1305 tag)
pub const HEADER_PAYLOAD_SIZE: usize = 976;
pub const HEADER_CIPHERTEXT_SIZE: usize = HEADER_PAYLOAD_SIZE + 16; // 992
pub const SLOT_HEADER_TOTAL_SIZE: usize = kdf::SALT_LEN + HEADER_CIPHERTEXT_SIZE; // 1024

/// Slot 0 (Primary Volume) offset.
pub const SLOT_0_OFFSET: usize = 0;
pub const SLOT_0_PAYLOAD_OFFSET: usize = SLOT_0_OFFSET + kdf::SALT_LEN;

/// Slot 1 (Hidden Volume) offset (at the 32 KiB mark).
pub const SLOT_1_OFFSET: usize = 32 * 1024;
pub const SLOT_1_PAYLOAD_OFFSET: usize = SLOT_1_OFFSET + kdf::SALT_LEN;

/// Associated Authenticated Data for AEAD encryption.
pub const AAD_SLOT_0: &[u8] = b"HEARTWOOD_SLOT_0_PRIMARY";
pub const AAD_SLOT_1: &[u8] = b"HEARTWOOD_SLOT_1_HIDDEN";

#[derive(Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum DistressMode {
    Immediate,
    Deferred,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
pub struct DistressConfig {
    pub trusted_contact_address: String,
    pub trusted_contact_ivk: String,
    pub distress_amount_zatoshis: u64,
    pub mode: DistressMode,
    pub default_message: String,
}

#[derive(Serialize, Deserialize, Clone, Debug, ZeroizeOnDrop)]
pub struct VolumeDescriptor {
    pub seed: [u8; 32],
    #[zeroize(skip)]
    pub mnemonic: String,
    #[zeroize(skip)]
    pub account_name: String,
    #[zeroize(skip)]
    pub created_at: i64,
    #[zeroize(skip)]
    pub initial_balance_zatoshis: u64,
    #[zeroize(skip)]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub distress_config: Option<DistressConfig>,
}

#[derive(Clone, Debug, Serialize)]
pub struct UnlockMetrics {
    pub elapsed_ms: u64,
    pub slot_attempted_0: bool,
    pub slot_attempted_1: bool,
    pub is_synthetic: bool,
}

pub struct Container {
    data: Vec<u8>,
}

impl Default for Container {
    fn default() -> Self {
        Self::new()
    }
}

impl Drop for Container {
    fn drop(&mut self) {
        self.data.zeroize();
    }
}

impl Container {
    /// Creates a new fixed-size container completely filled with CSPRNG noise.
    pub fn new() -> Self {
        let mut data = vec![0u8; CONTAINER_SIZE];
        entropy::fill_random(&mut data);
        Self { data }
    }

    /// Loads a container from raw bytes. Validates exact container size.
    pub fn from_bytes(bytes: &[u8]) -> Result<Self> {
        if bytes.len() != CONTAINER_SIZE {
            return Err(HeartwoodError::Keystore(format!(
                "Invalid container size: expected {} bytes, got {}",
                CONTAINER_SIZE,
                bytes.len()
            )));
        }
        Ok(Self {
            data: bytes.to_vec(),
        })
    }

    /// Reads container from disk.
    pub fn load_from_file<P: AsRef<Path>>(path: P) -> Result<Self> {
        let bytes = std::fs::read(path)?;
        Self::from_bytes(&bytes)
    }

    /// Writes container to disk.
    pub fn save_to_file<P: AsRef<Path>>(&self, path: P) -> Result<()> {
        std::fs::write(path, &self.data)?;
        Ok(())
    }

    /// Returns the raw container bytes.
    pub fn as_bytes(&self) -> &[u8] {
        &self.data
    }

    /// Populates Slot 0 (Primary Volume).
    pub fn set_slot_0(&mut self, pin: &str, descriptor: &VolumeDescriptor) -> Result<()> {
        self.write_slot(SLOT_0_OFFSET, pin, descriptor, AAD_SLOT_0)
    }

    /// Populates Slot 1 (Hidden Volume in padding area).
    pub fn set_slot_1(&mut self, pin: &str, descriptor: &VolumeDescriptor) -> Result<()> {
        self.write_slot(SLOT_1_OFFSET, pin, descriptor, AAD_SLOT_1)
    }

    fn write_slot(
        &mut self,
        offset: usize,
        pin: &str,
        descriptor: &VolumeDescriptor,
        aad: &[u8],
    ) -> Result<()> {
        let mut salt = [0u8; kdf::SALT_LEN];
        entropy::fill_random(&mut salt);

        let (mut key, mut nonce) = kdf::derive_key_and_nonce(pin, &salt, aad)?;
        let serialized = serde_json::to_vec(descriptor)?;

        if serialized.len() > HEADER_PAYLOAD_SIZE - 4 {
            key.zeroize();
            nonce.zeroize();
            return Err(HeartwoodError::Keystore("Descriptor exceeds maximum header size".into()));
        }

        // 4 bytes length prefix + payload + CSPRNG padding to HEADER_PAYLOAD_SIZE
        let mut padded = vec![0u8; HEADER_PAYLOAD_SIZE];
        let len_bytes = (serialized.len() as u32).to_be_bytes();
        padded[0..4].copy_from_slice(&len_bytes);
        padded[4..4 + serialized.len()].copy_from_slice(&serialized);
        entropy::fill_random(&mut padded[4 + serialized.len()..]);

        let ciphertext = aead::encrypt(&key, &nonce, &padded, aad)?;
        key.zeroize();
        nonce.zeroize();
        padded.zeroize();

        let payload_offset = offset + kdf::SALT_LEN;
        self.data[offset..payload_offset].copy_from_slice(&salt);
        self.data[payload_offset..payload_offset + HEADER_CIPHERTEXT_SIZE]
            .copy_from_slice(&ciphertext);

        Ok(())
    }

    /// Constant-time unlock flow.
    ///
    /// ALWAYS performs both KDF derivations and both decryption attempts regardless of
    /// which PIN is provided.
    /// If neither slot decrypts, it deterministically generates a synthetic ephemeral descriptor,
    /// presenting an empty wallet without raising an error oracle.
    pub fn unlock(&self, pin: &str) -> (VolumeDescriptor, UnlockMetrics) {
        let start = Instant::now();

        // Step 1: Slot 0 evaluation
        let salt_0 = &self.data[SLOT_0_OFFSET..SLOT_0_PAYLOAD_OFFSET];
        let (mut key_0, mut nonce_0) = kdf::derive_key_and_nonce(pin, salt_0, AAD_SLOT_0)
            .unwrap_or(([0u8; 32], [0u8; 12]));
        let ct_0 = &self.data[SLOT_0_PAYLOAD_OFFSET..SLOT_0_PAYLOAD_OFFSET + HEADER_CIPHERTEXT_SIZE];
        let desc_0 = Self::try_decrypt(&key_0, &nonce_0, ct_0, AAD_SLOT_0);

        // Step 2: Slot 1 evaluation (always run to preserve timing equality)
        let salt_1 = &self.data[SLOT_1_OFFSET..SLOT_1_PAYLOAD_OFFSET];
        let (mut key_1, mut nonce_1) = kdf::derive_key_and_nonce(pin, salt_1, AAD_SLOT_1)
            .unwrap_or(([0u8; 32], [0u8; 12]));
        let ct_1 = &self.data[SLOT_1_PAYLOAD_OFFSET..SLOT_1_PAYLOAD_OFFSET + HEADER_CIPHERTEXT_SIZE];
        let desc_1 = Self::try_decrypt(&key_1, &nonce_1, ct_1, AAD_SLOT_1);

        let elapsed = start.elapsed().as_millis() as u64;

        let result = if let Some(d0) = desc_0 {
            (
                d0,
                UnlockMetrics {
                    elapsed_ms: elapsed,
                    slot_attempted_0: true,
                    slot_attempted_1: true,
                    is_synthetic: false,
                },
            )
        } else if let Some(d1) = desc_1 {
            (
                d1,
                UnlockMetrics {
                    elapsed_ms: elapsed,
                    slot_attempted_0: true,
                    slot_attempted_1: true,
                    is_synthetic: false,
                },
            )
        } else {
            // Ephemeral synthetic decoy generation from key_0
            let synthetic_desc = Self::generate_synthetic(&key_0);
            (
                synthetic_desc,
                UnlockMetrics {
                    elapsed_ms: elapsed,
                    slot_attempted_0: true,
                    slot_attempted_1: true,
                    is_synthetic: true,
                },
            )
        };

        // Secure cleanup of key material in memory
        key_0.zeroize();
        nonce_0.zeroize();
        key_1.zeroize();
        nonce_1.zeroize();

        result
    }

    fn try_decrypt(
        key: &[u8; 32],
        nonce: &[u8; 12],
        ciphertext: &[u8],
        aad: &[u8],
    ) -> Option<VolumeDescriptor> {
        let mut plaintext = aead::decrypt(key, nonce, ciphertext, aad).ok()?;
        if plaintext.len() < 4 {
            plaintext.zeroize();
            return None;
        }

        let mut len_bytes = [0u8; 4];
        len_bytes.copy_from_slice(&plaintext[0..4]);
        let len = u32::from_be_bytes(len_bytes) as usize;

        if 4 + len > plaintext.len() {
            plaintext.zeroize();
            return None;
        }

        let desc = serde_json::from_slice::<VolumeDescriptor>(&plaintext[4..4 + len]).ok();
        plaintext.zeroize();
        desc
    }

    fn generate_synthetic(seed_material: &[u8; 32]) -> VolumeDescriptor {
        use sha2::{Digest, Sha256};
        let mut hasher = Sha256::new();
        hasher.update(b"HEARTWOOD_SYNTHETIC_DEC_SEED");
        hasher.update(seed_material);
        let synthetic_seed: [u8; 32] = hasher.finalize().into();

        VolumeDescriptor {
            seed: synthetic_seed,
            mnemonic: "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about".into(),
            account_name: "Shielded Account".into(),
            created_at: 1700000000,
            initial_balance_zatoshis: 0,
            distress_config: None,
        }
    }
}
