use chacha20poly1305::aead::{Aead, KeyInit, Payload};
use chacha20poly1305::{ChaCha20Poly1305, Key, Nonce};
use crate::error::{HeartwoodError, Result};

pub fn encrypt(
    key: &[u8; 32],
    nonce: &[u8; 12],
    plaintext: &[u8],
    associated_data: &[u8],
) -> Result<Vec<u8>> {
    let cipher_key = Key::from_slice(key);
    let cipher = ChaCha20Poly1305::new(cipher_key);
    let cipher_nonce = Nonce::from_slice(nonce);

    let payload = Payload {
        msg: plaintext,
        aad: associated_data,
    };

    cipher
        .encrypt(cipher_nonce, payload)
        .map_err(|e| HeartwoodError::Crypto(format!("AEAD encryption failed: {e}")))
}

pub fn decrypt(
    key: &[u8; 32],
    nonce: &[u8; 12],
    ciphertext: &[u8],
    associated_data: &[u8],
) -> Result<Vec<u8>> {
    let cipher_key = Key::from_slice(key);
    let cipher = ChaCha20Poly1305::new(cipher_key);
    let cipher_nonce = Nonce::from_slice(nonce);

    let payload = Payload {
        msg: ciphertext,
        aad: associated_data,
    };

    cipher
        .decrypt(cipher_nonce, payload)
        .map_err(|e| HeartwoodError::Crypto(format!("AEAD decryption failed: {e}")))
}
