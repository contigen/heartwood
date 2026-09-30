use argon2::{Algorithm, Argon2, Params, Version};
use crate::error::{HeartwoodError, Result};
use zeroize::Zeroize;

pub const SALT_LEN: usize = 32;
pub const KEY_LEN: usize = 32;

/// Memory-hard KDF parameters calibrated for high security while remaining
/// responsive (~100-200ms) for real-time mobile/desktop unlock flows.
pub const ARGON2_M_COST_KIB: u32 = 32 * 1024; // 32 MiB RAM
pub const ARGON2_T_COST: u32 = 3;             // 3 iterations
pub const ARGON2_P_COST: u32 = 1;             // 1 thread

/// Derives a 32-byte encryption key from a user PIN and salt using Argon2id.
pub fn derive_key(pin: &str, salt: &[u8]) -> Result<[u8; KEY_LEN]> {
    let params = Params::new(
        ARGON2_M_COST_KIB,
        ARGON2_T_COST,
        ARGON2_P_COST,
        Some(KEY_LEN),
    ).map_err(|e| HeartwoodError::Crypto(format!("Invalid Argon2 params: {e}")))?;

    let argon2 = Argon2::new(Algorithm::Argon2id, Version::V0x13, params);

    let mut key = [0u8; KEY_LEN];
    if let Err(e) = argon2.hash_password_into(pin.as_bytes(), salt, &mut key) {
        key.zeroize();
        return Err(HeartwoodError::Crypto(format!("Argon2id hashing failed: {e}")));
    }

    Ok(key)
}

/// Derives both a 32-byte key and a 12-byte nonce deterministically from PIN, salt, and domain.
pub fn derive_key_and_nonce(
    pin: &str,
    salt: &[u8],
    domain: &[u8],
) -> Result<([u8; 32], [u8; 12])> {
    let mut combined_salt = Vec::with_capacity(salt.len() + domain.len());
    combined_salt.extend_from_slice(salt);
    combined_salt.extend_from_slice(domain);

    let params = Params::new(
        ARGON2_M_COST_KIB,
        ARGON2_T_COST,
        ARGON2_P_COST,
        Some(44), // 32 bytes key + 12 bytes nonce
    ).map_err(|e| HeartwoodError::Crypto(format!("Invalid Argon2 params: {e}")))?;

    let argon2 = Argon2::new(Algorithm::Argon2id, Version::V0x13, params);
    let mut output = [0u8; 44];
    let res = argon2.hash_password_into(pin.as_bytes(), &combined_salt, &mut output);

    if let Err(e) = res {
        output.zeroize();
        return Err(HeartwoodError::Crypto(format!("Argon2id hashing failed: {e}")));
    }

    let mut key = [0u8; 32];
    let mut nonce = [0u8; 12];
    key.copy_from_slice(&output[0..32]);
    nonce.copy_from_slice(&output[32..44]);
    output.zeroize();

    Ok((key, nonce))
}
