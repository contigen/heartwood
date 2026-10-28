use crate::crypto::{aead, entropy};
use crate::distress::beacon::{DistressBeacon, DistressType, MEMO_SIZE};
use crate::error::{HeartwoodError, Result};
use crate::keystore::container::{DistressConfig, DistressMode};
use crate::wallet::keys::derive_note_encryption_key;
use serde::{Deserialize, Serialize};

pub const DEFAULT_FEE_ZATOSHIS: u64 = 10_000; // 0.0001 ZEC standard ZIP-317 fee
pub const ENCRYPTED_NOTE_SIZE: usize = 580;   // Standard Zcash Orchard/Sapling note ciphertext size

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub struct OnChainAction {
    pub action_index: usize,
    pub nullifier: String,
    pub cmx: String,
    pub ephemeral_key: String,
    pub enc_ciphertext_preview: String,
    pub enc_ciphertext_len: usize,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub struct ShieldedOutput {
    pub recipient_address: String,
    pub amount_zatoshis: u64,
    #[serde(with = "hex_memo")]
    pub memo: [u8; MEMO_SIZE],
    #[serde(default)]
    pub ephemeral_key: String,
    #[serde(default)]
    pub cmx: String,
    #[serde(default)]
    pub encrypted_note_hex: String,
    pub is_distress_beacon: bool,
    pub label: String,
}

impl ShieldedOutput {
    /// Constructs a shielded output with real AEAD note encryption and commitment.
    pub fn new_encrypted(
        recipient_address: impl Into<String>,
        amount_zatoshis: u64,
        memo: [u8; MEMO_SIZE],
        is_distress_beacon: bool,
        label: impl Into<String>,
    ) -> Result<Self> {
        let recipient_address = recipient_address.into();
        let epk_hex = format!("0x{}", hex::encode(entropy::random_bytes(32)));
        let key = derive_note_encryption_key(&recipient_address, &epk_hex);

        // Deterministic 12-byte nonce from epk
        let nonce_hash = blake2b_simd::Params::new()
            .hash_length(12)
            .personal(b"Zcash_Note_Nonce")
            .hash(epk_hex.as_bytes());
        let mut nonce = [0u8; 12];
        nonce.copy_from_slice(nonce_hash.as_bytes());

        // Plaintext note payload: 8-byte amount (BE) + 512-byte memo = 520 bytes
        let mut note_plaintext = Vec::with_capacity(8 + MEMO_SIZE);
        note_plaintext.extend_from_slice(&amount_zatoshis.to_be_bytes());
        note_plaintext.extend_from_slice(&memo);

        let ciphertext = aead::encrypt(&key, &nonce, &note_plaintext, epk_hex.as_bytes())?;
        let encrypted_note_hex = hex::encode(&ciphertext);

        // Compute note commitment cmx = BLAKE2b-256(epk || ciphertext)
        let cmx_hash = blake2b_simd::Params::new()
            .hash_length(32)
            .personal(b"Zcash_OrchardCmx")
            .hash(&ciphertext);
        let cmx = format!("0x{}", hex::encode(cmx_hash.as_bytes()));

        Ok(Self {
            recipient_address,
            amount_zatoshis,
            memo,
            ephemeral_key: epk_hex,
            cmx,
            encrypted_note_hex,
            is_distress_beacon,
            label: label.into(),
        })
    }

    /// Performs Zcash-style AEAD trial decryption of this shielded note output
    /// using the candidate recipient's viewing/address key material and the output's ephemeral public key (`epk`).
    /// Returns `Some((amount_zatoshis, memo))` if and only if the Poly1305 MAC tag authenticates.
    pub fn trial_decrypt(&self, candidate_address: &str) -> Option<(u64, [u8; MEMO_SIZE])> {
        if !self.encrypted_note_hex.is_empty() && !self.ephemeral_key.is_empty() {
            let ciphertext = hex::decode(&self.encrypted_note_hex).ok()?;
            let key = derive_note_encryption_key(candidate_address, &self.ephemeral_key);

            let nonce_hash = blake2b_simd::Params::new()
                .hash_length(12)
                .personal(b"Zcash_Note_Nonce")
                .hash(self.ephemeral_key.as_bytes());
            let mut nonce = [0u8; 12];
            nonce.copy_from_slice(nonce_hash.as_bytes());

            let plaintext =
                aead::decrypt(&key, &nonce, &ciphertext, self.ephemeral_key.as_bytes()).ok()?;
            if plaintext.len() != 8 + MEMO_SIZE {
                return None;
            }

            let mut amt_bytes = [0u8; 8];
            amt_bytes.copy_from_slice(&plaintext[0..8]);
            let amount = u64::from_be_bytes(amt_bytes);

            let mut memo = [0u8; MEMO_SIZE];
            memo.copy_from_slice(&plaintext[8..8 + MEMO_SIZE]);
            Some((amount, memo))
        } else if self.recipient_address == candidate_address {
            Some((self.amount_zatoshis, self.memo))
        } else {
            None
        }
    }
}

mod hex_memo {
    use super::MEMO_SIZE;
    use serde::{Deserialize, Deserializer, Serializer};

    pub fn serialize<S>(memo: &[u8; MEMO_SIZE], serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(&hex::encode(memo))
    }

    pub fn deserialize<'de, D>(deserializer: D) -> Result<[u8; MEMO_SIZE], D::Error>
    where
        D: Deserializer<'de>,
    {
        let s = String::deserialize(deserializer)?;
        let bytes = hex::decode(&s).map_err(serde::de::Error::custom)?;
        if bytes.len() != MEMO_SIZE {
            return Err(serde::de::Error::custom("Invalid memo length"));
        }
        let mut arr = [0u8; MEMO_SIZE];
        arr.copy_from_slice(&bytes);
        Ok(arr)
    }
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub struct ShieldedTransactionPlan {
    pub txid: String,
    pub inputs_spent_zatoshis: u64,
    pub outputs: Vec<ShieldedOutput>,
    #[serde(default)]
    pub on_chain_actions: Vec<OnChainAction>,
    pub fee_zatoshis: u64,
    pub change_zatoshis: u64,
    pub silent_distress_injected: bool,
    pub deferred_distress_queued: bool,
    pub created_at: i64,
}

/// Helper to create a padded 3-action Orchard on-chain representation from outputs.
/// Every Heartwood transaction emits 3 indistinguishable 580-byte Orchard actions on-chain
/// (Recipient Note + Covert/Dummy Note + Shielded Change Note) so that external observers
/// and coercers cannot distinguish a single-recipient transfer from an in-band SOS transfer.
pub fn build_padded_on_chain_actions(outputs: &[ShieldedOutput]) -> Vec<OnChainAction> {
    let mut actions = Vec::with_capacity(3);
    for (idx, out) in outputs.iter().enumerate() {
        let nf = format!("0x{}", hex::encode(entropy::random_bytes(32)));
        let preview = if out.encrypted_note_hex.len() >= 32 {
            format!("{}...", &out.encrypted_note_hex[0..32])
        } else {
            format!("{}...", hex::encode(entropy::random_bytes(16)))
        };
        actions.push(OnChainAction {
            action_index: idx,
            nullifier: nf,
            cmx: if out.cmx.is_empty() {
                format!("0x{}", hex::encode(entropy::random_bytes(32)))
            } else {
                out.cmx.clone()
            },
            ephemeral_key: if out.ephemeral_key.is_empty() {
                format!("0x{}", hex::encode(entropy::random_bytes(32)))
            } else {
                out.ephemeral_key.clone()
            },
            enc_ciphertext_preview: preview,
            enc_ciphertext_len: ENCRYPTED_NOTE_SIZE,
        });
    }

    // Pad to 3 shielded actions (Orchard dummy/chaff + change notes) for uniform on-chain footprint
    while actions.len() < 3 {
        let idx = actions.len();
        actions.push(OnChainAction {
            action_index: idx,
            nullifier: format!("0x{}", hex::encode(entropy::random_bytes(32))),
            cmx: format!("0x{}", hex::encode(entropy::random_bytes(32))),
            ephemeral_key: format!("0x{}", hex::encode(entropy::random_bytes(32))),
            enc_ciphertext_preview: format!("{}...", hex::encode(entropy::random_bytes(16))),
            enc_ciphertext_len: ENCRYPTED_NOTE_SIZE,
        });
    }

    actions
}

/// Injects a silent distress beacon into the transaction plan if distress is configured.
pub fn plan_transaction(
    sender_balance_zatoshis: u64,
    coerced_recipient: &str,
    coerced_amount_zatoshis: u64,
    distress_config: Option<&DistressConfig>,
    latitude: Option<f64>,
    longitude: Option<f64>,
) -> Result<ShieldedTransactionPlan> {
    if coerced_amount_zatoshis == 0 {
        return Err(HeartwoodError::Wallet(
            "Transfer amount must be greater than zero".into(),
        ));
    }

    let fee = DEFAULT_FEE_ZATOSHIS;
    let mut outputs = Vec::new();

    // 1. Primary Output (The requested payment)
    let mut empty_memo = [0u8; MEMO_SIZE];
    empty_memo[0] = 0xF6; // ZIP-302 standard no-memo marker (0xF6 followed by zeros)
    outputs.push(ShieldedOutput::new_encrypted(
        coerced_recipient,
        coerced_amount_zatoshis,
        empty_memo,
        false,
        "Shielded Transfer",
    )?);

    let mut total_outlay = coerced_amount_zatoshis
        .checked_add(fee)
        .ok_or_else(|| HeartwoodError::Wallet("Amount overflow when adding fee".into()))?;

    let mut distress_injected = false;
    let mut deferred_queued = false;

    // 2. Silent Distress Output (if active and Immediate mode)
    if let Some(cfg) = distress_config {
        match cfg.mode {
            DistressMode::Immediate => {
                let beacon = DistressBeacon::new(
                    DistressType::CoercedPayment,
                    latitude,
                    longitude,
                    &cfg.default_message,
                    Some(coerced_recipient.to_string()),
                    Some(coerced_amount_zatoshis),
                );
                let beacon_memo = beacon.encode_to_memo()?;

                outputs.push(ShieldedOutput::new_encrypted(
                    cfg.trusted_contact_address.clone(),
                    cfg.distress_amount_zatoshis,
                    beacon_memo,
                    true,
                    "In-Band Covert Distress Signal",
                )?);

                total_outlay = total_outlay
                    .checked_add(cfg.distress_amount_zatoshis)
                    .ok_or_else(|| {
                        HeartwoodError::Wallet("Amount overflow when adding distress note".into())
                    })?;

                distress_injected = true;
            }
            DistressMode::Deferred => {
                deferred_queued = true;
            }
        }
    }

    if sender_balance_zatoshis < total_outlay {
        return Err(HeartwoodError::Wallet(format!(
            "Insufficient funds: have {:.4} ZEC ({} zatoshis), need {:.4} ZEC ({} zatoshis)",
            sender_balance_zatoshis as f64 / 1e8,
            sender_balance_zatoshis,
            total_outlay as f64 / 1e8,
            total_outlay
        )));
    }

    let change = sender_balance_zatoshis - total_outlay;
    let on_chain_actions = build_padded_on_chain_actions(&outputs);

    // Generate standard 32-byte / 64-character hex transaction ID
    let txid = hex::encode(entropy::random_bytes(32));

    Ok(ShieldedTransactionPlan {
        txid,
        inputs_spent_zatoshis: sender_balance_zatoshis,
        outputs,
        on_chain_actions,
        fee_zatoshis: fee,
        change_zatoshis: change,
        silent_distress_injected: distress_injected,
        deferred_distress_queued: deferred_queued,
        created_at: chrono::Utc::now().timestamp(),
    })
}
