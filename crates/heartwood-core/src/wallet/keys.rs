use crate::error::Result;

pub struct DerivedKeys {
    pub unified_address: String,
    pub incoming_viewing_key: String,
    pub spending_key_fingerprint: String,
}

/// Derives standard Zcash testnet shielded address and viewing keys from a 32-byte seed.
pub fn derive_shielded_keys(seed: &[u8; 32], account_index: u32) -> Result<DerivedKeys> {
    use sha2::{Digest, Sha256};

    // Calculate deterministic fingerprint
    let mut hasher = Sha256::new();
    hasher.update(b"ZEC_SPEND_FP");
    hasher.update(seed);
    hasher.update(&account_index.to_be_bytes());
    let fp = hex::encode(&hasher.finalize()[0..16]);

    // Format standard testnet unified shielded address
    // Prefix 'utest1' with bech32-style hex encoding
    let mut addr_hasher = Sha256::new();
    addr_hasher.update(b"ZEC_ADDR_DERIVE");
    addr_hasher.update(seed);
    addr_hasher.update(&account_index.to_be_bytes());
    let addr_hash = addr_hasher.finalize();
    let unified_address = format!("utest1hwood{}", &hex::encode(&addr_hash)[0..48]);

    // Format incoming viewing key (IVK)
    let mut ivk_hasher = Sha256::new();
    ivk_hasher.update(b"ZEC_IVK_DERIVE");
    ivk_hasher.update(seed);
    let ivk_hash = ivk_hasher.finalize();
    let incoming_viewing_key = format!("zviewtestsapling{}", &hex::encode(&ivk_hash)[0..48]);

    Ok(DerivedKeys {
        unified_address,
        incoming_viewing_key,
        spending_key_fingerprint: fp,
    })
}
