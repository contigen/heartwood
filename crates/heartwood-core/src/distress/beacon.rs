use crate::crypto::entropy;
use crate::error::{HeartwoodError, Result};
use chrono::Utc;
use serde::{Deserialize, Serialize};

pub const MEMO_SIZE: usize = 512;
pub const SOS_MAGIC: &[u8; 8] = b"HWOODSOS";
pub const SOS_VERSION: u8 = 1;

#[derive(Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum DistressType {
    CoercedPayment = 1,
    DuressUnlock = 2,
    HostageSituation = 3,
    SilentTracking = 4,
}

impl DistressType {
    pub fn from_u8(v: u8) -> Option<Self> {
        match v {
            1 => Some(Self::CoercedPayment),
            2 => Some(Self::DuressUnlock),
            3 => Some(Self::HostageSituation),
            4 => Some(Self::SilentTracking),
            _ => None,
        }
    }

    pub fn to_u8(self) -> u8 {
        self as u8
    }

    pub fn description(&self) -> &'static str {
        match self {
            Self::CoercedPayment => "Coerced Fund Transfer in Progress",
            Self::DuressUnlock => "Device Unlocked Under Coercion",
            Self::HostageSituation => "Physical Threat / Hostage Situation",
            Self::SilentTracking => "Covert Geolocation / Tracking Ping",
        }
    }
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub struct DistressBeacon {
    pub distress_type: DistressType,
    pub timestamp: i64,
    pub latitude: Option<f64>,
    pub longitude: Option<f64>,
    pub alert_message: String,
    pub coerced_recipient: Option<String>,
    pub coerced_amount_zatoshis: Option<u64>,
}

impl DistressBeacon {
    /// Creates a new distress beacon with current timestamp and location.
    pub fn new(
        distress_type: DistressType,
        latitude: Option<f64>,
        longitude: Option<f64>,
        alert_message: impl Into<String>,
        coerced_recipient: Option<String>,
        coerced_amount_zatoshis: Option<u64>,
    ) -> Self {
        Self {
            distress_type,
            timestamp: Utc::now().timestamp(),
            latitude,
            longitude,
            alert_message: alert_message.into(),
            coerced_recipient,
            coerced_amount_zatoshis,
        }
    }

    /// Serializes the beacon into a standard 512-byte Zcash shielded memo.
    ///
    /// Format:
    /// - [0..8]   : Magic bytes b"HWOODSOS"
    /// - [8]      : Version (0x01)
    /// - [9]      : DistressType (u8)
    /// - [10..18] : Timestamp i64 (be)
    /// - [18..20] : JSON payload length u16 (be)
    /// - [20..20+len] : JSON metadata (coords, alert msg, coerced info)
    /// - [20+len..512] : CSPRNG cryptographic padding
    pub fn encode_to_memo(&self) -> Result<[u8; MEMO_SIZE]> {
        let mut memo = [0u8; MEMO_SIZE];
        entropy::fill_random(&mut memo);

        memo[0..8].copy_from_slice(SOS_MAGIC);
        memo[8] = SOS_VERSION;
        memo[9] = self.distress_type.to_u8();
        memo[10..18].copy_from_slice(&self.timestamp.to_be_bytes());

        #[derive(Serialize)]
        struct BeaconMeta<'a> {
            lat: Option<f64>,
            lon: Option<f64>,
            msg: &'a str,
            coerced_to: Option<&'a str>,
            amount_zat: Option<u64>,
        }

        let meta = BeaconMeta {
            lat: self.latitude,
            lon: self.longitude,
            msg: &self.alert_message,
            coerced_to: self.coerced_recipient.as_deref(),
            amount_zat: self.coerced_amount_zatoshis,
        };

        let json_bytes = serde_json::to_vec(&meta)?;
        if json_bytes.len() > (MEMO_SIZE - 20) {
            return Err(HeartwoodError::Distress("Beacon payload exceeds 512-byte memo size".into()));
        }

        let len = json_bytes.len() as u16;
        memo[18..20].copy_from_slice(&len.to_be_bytes());
        memo[20..20 + json_bytes.len()].copy_from_slice(&json_bytes);

        Ok(memo)
    }

    /// Decodes a 512-byte Zcash shielded memo into a DistressBeacon if magic matches.
    pub fn decode_from_memo(memo: &[u8]) -> Result<Option<Self>> {
        if memo.len() < 20 {
            return Ok(None);
        }

        if &memo[0..8] != SOS_MAGIC {
            return Ok(None);
        }

        let version = memo[8];
        if version != SOS_VERSION {
            return Err(HeartwoodError::Distress(format!("Unsupported beacon version {version}")));
        }

        let distress_type = DistressType::from_u8(memo[9])
            .ok_or_else(|| HeartwoodError::Distress(format!("Unknown distress type {}", memo[9])))?;

        let mut ts_bytes = [0u8; 8];
        ts_bytes.copy_from_slice(&memo[10..18]);
        let timestamp = i64::from_be_bytes(ts_bytes);

        let mut len_bytes = [0u8; 2];
        len_bytes.copy_from_slice(&memo[18..20]);
        let len = u16::from_be_bytes(len_bytes) as usize;

        if 20 + len > memo.len() {
            return Err(HeartwoodError::Distress("Malformed beacon payload length".into()));
        }

        #[derive(Deserialize)]
        struct BeaconMeta {
            lat: Option<f64>,
            lon: Option<f64>,
            msg: String,
            coerced_to: Option<String>,
            amount_zat: Option<u64>,
        }

        let meta: BeaconMeta = serde_json::from_slice(&memo[20..20 + len])?;

        Ok(Some(Self {
            distress_type,
            timestamp,
            latitude: meta.lat,
            longitude: meta.lon,
            alert_message: meta.msg,
            coerced_recipient: meta.coerced_to,
            coerced_amount_zatoshis: meta.amount_zat,
        }))
    }
}
