use thiserror::Error;

#[derive(Error, Debug)]
pub enum HeartwoodError {
    #[error("Keystore error: {0}")]
    Keystore(String),

    #[error("Cryptographic error: {0}")]
    Crypto(String),

    #[error("Key derivation error: {0}")]
    KeyDerivation(String),

    #[error("Wallet error: {0}")]
    Wallet(String),

    #[error("Distress beacon error: {0}")]
    Distress(String),

    #[error("I/O error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),
}

pub type Result<T> = std::result::Result<T, HeartwoodError>;
