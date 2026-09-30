use crate::distress::beacon::{DistressBeacon, DistressType, MEMO_SIZE};
use crate::error::{HeartwoodError, Result};
use crate::keystore::container::{DistressConfig, DistressMode};
use serde::{Deserialize, Serialize};

pub const DEFAULT_FEE_ZATOSHIS: u64 = 10_000; // 0.0001 ZEC standard ZIP-317 fee

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub struct ShieldedOutput {
    pub recipient_address: String,
    pub amount_zatoshis: u64,
    #[serde(with = "hex_memo")]
    pub memo: [u8; MEMO_SIZE],
    pub is_distress_beacon: bool,
    pub label: String,
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
    pub fee_zatoshis: u64,
    pub change_zatoshis: u64,
    pub silent_distress_injected: bool,
    pub deferred_distress_queued: bool,
    pub created_at: i64,
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
    let fee = DEFAULT_FEE_ZATOSHIS;
    let mut outputs = Vec::new();

    // 1. Primary Output (The coerced payment)
    let empty_memo = [0u8; MEMO_SIZE];
    outputs.push(ShieldedOutput {
        recipient_address: coerced_recipient.to_string(),
        amount_zatoshis: coerced_amount_zatoshis,
        memo: empty_memo,
        is_distress_beacon: false,
        label: "Primary Coerced Transfer".into(),
    });

    let mut total_outlay = coerced_amount_zatoshis + fee;
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

                outputs.push(ShieldedOutput {
                    recipient_address: cfg.trusted_contact_address.clone(),
                    amount_zatoshis: cfg.distress_amount_zatoshis,
                    memo: beacon_memo,
                    is_distress_beacon: true,
                    label: "In-Band Covert Distress Signal".into(),
                });

                total_outlay += cfg.distress_amount_zatoshis;
                distress_injected = true;
            }
            DistressMode::Deferred => {
                deferred_queued = true;
            }
        }
    }

    if sender_balance_zatoshis < total_outlay {
        return Err(HeartwoodError::Wallet(format!(
            "Insufficient funds: have {} zatoshis, need {}",
            sender_balance_zatoshis, total_outlay
        )));
    }

    let change = sender_balance_zatoshis - total_outlay;

    // Generate deterministic simulated TxID
    let txid = format!(
        "tx_{}",
        hex::encode(&crate::crypto::entropy::random_bytes(32))
    );

    Ok(ShieldedTransactionPlan {
        txid,
        inputs_spent_zatoshis: sender_balance_zatoshis,
        outputs,
        fee_zatoshis: fee,
        change_zatoshis: change,
        silent_distress_injected: distress_injected,
        deferred_distress_queued: deferred_queued,
        created_at: chrono::Utc::now().timestamp(),
    })
}
