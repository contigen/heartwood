use crate::distress::beacon::{DistressBeacon, MEMO_SIZE};
use crate::distress::injector::ShieldedTransactionPlan;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct DistressAlert {
    pub alert_id: String,
    pub txid: String,
    pub detected_at: i64,
    pub received_zatoshis: u64,
    pub beacon: DistressBeacon,
}

pub struct TrustedContactScanner {
    contact_address: String,
    incoming_viewing_key: String,
}

impl TrustedContactScanner {
    pub fn new(contact_address: impl Into<String>, incoming_viewing_key: impl Into<String>) -> Self {
        Self {
            contact_address: contact_address.into(),
            incoming_viewing_key: incoming_viewing_key.into(),
        }
    }

    pub fn contact_address(&self) -> &str {
        &self.contact_address
    }

    pub fn incoming_viewing_key(&self) -> &str {
        &self.incoming_viewing_key
    }

    /// Scans a shielded transaction plan for outputs matching this trusted contact
    /// and extracts any embedded distress beacons from the memo.
    pub fn scan_transaction(&self, tx: &ShieldedTransactionPlan) -> Vec<DistressAlert> {
        let mut alerts = Vec::new();

        for output in &tx.outputs {
            // Check if output is addressed to this contact
            if output.recipient_address == self.contact_address {
                // Attempt to decode the 512-byte memo as a distress beacon
                if let Ok(Some(beacon)) = DistressBeacon::decode_from_memo(&output.memo) {
                    alerts.push(DistressAlert {
                        alert_id: format!("sos_{}", hex::encode(&output.memo[10..18])),
                        txid: tx.txid.clone(),
                        detected_at: chrono::Utc::now().timestamp(),
                        received_zatoshis: output.amount_zatoshis,
                        beacon,
                    });
                }
            }
        }

        alerts
    }

    /// Scans a standalone raw 512-byte memo byte array.
    pub fn scan_memo(&self, memo: &[u8; MEMO_SIZE], txid: &str, amount_zatoshis: u64) -> Option<DistressAlert> {
        if let Ok(Some(beacon)) = DistressBeacon::decode_from_memo(memo) {
            Some(DistressAlert {
                alert_id: format!("sos_{}", hex::encode(&memo[10..18])),
                txid: txid.to_string(),
                detected_at: chrono::Utc::now().timestamp(),
                received_zatoshis: amount_zatoshis,
                beacon,
            })
        } else {
            None
        }
    }
}
