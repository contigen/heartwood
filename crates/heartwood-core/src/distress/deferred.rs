use crate::crypto::{aead, entropy};
use crate::distress::beacon::DistressBeacon;
use crate::distress::injector::{
    build_padded_on_chain_actions, ShieldedOutput, ShieldedTransactionPlan, DEFAULT_FEE_ZATOSHIS,
};
use crate::error::{HeartwoodError, Result};
use crate::keystore::container::DistressConfig;
use serde::{Deserialize, Serialize};
use std::path::Path;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct QueuedDistressItem {
    pub id: String,
    pub beacon: DistressBeacon,
    pub queued_at: i64,
}

pub struct DeferredQueue {
    items: Vec<QueuedDistressItem>,
}

impl Default for DeferredQueue {
    fn default() -> Self {
        Self::new()
    }
}

impl DeferredQueue {
    pub fn new() -> Self {
        Self { items: Vec::new() }
    }

    pub fn enqueue(&mut self, beacon: DistressBeacon) -> String {
        let id = format!("queue_{}", hex::encode(entropy::random_bytes(8)));
        self.items.push(QueuedDistressItem {
            id: id.clone(),
            beacon,
            queued_at: chrono::Utc::now().timestamp(),
        });
        id
    }

    pub fn len(&self) -> usize {
        self.items.len()
    }

    pub fn is_empty(&self) -> bool {
        self.items.is_empty()
    }

    pub fn peek_all(&self) -> &[QueuedDistressItem] {
        &self.items
    }

    /// Empties the queue and converts all queued beacons into broadcast-ready transactions.
    pub fn drain_and_create_broadcasts(
        &mut self,
        sender_balance: u64,
        distress_config: &DistressConfig,
    ) -> Result<Vec<ShieldedTransactionPlan>> {
        let fee = DEFAULT_FEE_ZATOSHIS;
        let per_tx_cost = distress_config.distress_amount_zatoshis + fee;
        let required_total = per_tx_cost.saturating_mul(self.items.len() as u64);
        if sender_balance < required_total {
            return Err(HeartwoodError::Wallet(format!(
                "Insufficient decoy balance to broadcast {} queued distress beacon(s): have {} zatoshis, need {} zatoshis",
                self.items.len(),
                sender_balance,
                required_total
            )));
        }

        let mut plans = Vec::new();
        let items: Vec<QueuedDistressItem> = self.items.drain(..).collect();
        let mut running_balance = sender_balance;

        for item in items {
            let memo = item.beacon.encode_to_memo()?;

            // Covert standalone beacon transfer to trusted contact (AEAD-encrypted note)
            let outputs = vec![ShieldedOutput::new_encrypted(
                distress_config.trusted_contact_address.clone(),
                distress_config.distress_amount_zatoshis,
                memo,
                true,
                "Deferred Outbox Covert Distress Broadcast",
            )?];

            let on_chain_actions = build_padded_on_chain_actions(&outputs);
            let change = running_balance.saturating_sub(per_tx_cost);

            let txid = hex::encode(crate::crypto::entropy::random_bytes(32));

            plans.push(ShieldedTransactionPlan {
                txid,
                inputs_spent_zatoshis: running_balance,
                outputs,
                on_chain_actions,
                fee_zatoshis: fee,
                change_zatoshis: change,
                silent_distress_injected: true,
                deferred_distress_queued: false,
                created_at: chrono::Utc::now().timestamp(),
            });

            running_balance = change;
        }

        Ok(plans)
    }

    /// Saves the queue encrypted to disk.
    pub fn save_encrypted<P: AsRef<Path>>(&self, path: P, key: &[u8; 32]) -> Result<()> {
        let nonce = entropy::random_bytes(12);
        let mut nonce_arr = [0u8; 12];
        nonce_arr.copy_from_slice(&nonce);

        let serialized = serde_json::to_vec(&self.items)?;
        let ciphertext = aead::encrypt(key, &nonce_arr, &serialized, b"DEFERRED_QUEUE")?;

        let mut out = Vec::with_capacity(12 + ciphertext.len());
        out.extend_from_slice(&nonce_arr);
        out.extend_from_slice(&ciphertext);
        std::fs::write(path, out)?;
        Ok(())
    }

    /// Loads the queue decrypted from disk.
    pub fn load_encrypted<P: AsRef<Path>>(path: P, key: &[u8; 32]) -> Result<Self> {
        let data = std::fs::read(path)?;
        if data.len() < 12 {
            return Ok(Self::new());
        }

        let mut nonce_arr = [0u8; 12];
        nonce_arr.copy_from_slice(&data[0..12]);
        let ciphertext = &data[12..];

        let plaintext = aead::decrypt(key, &nonce_arr, ciphertext, b"DEFERRED_QUEUE")?;
        let items: Vec<QueuedDistressItem> = serde_json::from_slice(&plaintext)?;
        Ok(Self { items })
    }
}
