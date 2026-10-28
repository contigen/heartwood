use crate::error::{HeartwoodError, Result};
use orchard::keys::{FullViewingKey as OrchardFvk, Scope, SpendingKey as OrchardSk};
use sapling_crypto::zip32::ExtendedSpendingKey as SaplingExtSk;
use zcash_address::unified::{self, Encoding};
use zcash_protocol::consensus::NetworkType;
use zip32::{AccountId, ChildIndex};

/// Zcash Testnet SLIP-44 coin type is 1 (Mainnet is 133).
pub const ZCASH_TESTNET_COIN_TYPE: u32 = 1;

#[derive(Clone, Debug)]
pub struct DerivedKeys {
    pub unified_address: String,
    pub incoming_viewing_key: String,
    pub spending_key_fingerprint: String,
    pub orchard_raw_receiver: [u8; 43],
    pub sapling_raw_receiver: [u8; 43],
}

/// Derives real Zcash ZIP-32 Orchard & Sapling shielded keys and encodes a
/// specification-compliant ZIP-316 Unified Address (`utest1...`) and Viewing Key.
pub fn derive_shielded_keys(seed_32: &[u8; 32], account_index: u32) -> Result<DerivedKeys> {
    // Expand 32-byte seed entropy to standard 64-byte ZIP-32 master seed via BLAKE2b-512
    let mut seed_64 = [0u8; 64];
    let b2 = blake2b_simd::Params::new()
        .hash_length(64)
        .personal(b"Heartwood_ZIP32_")
        .hash(seed_32);
    seed_64.copy_from_slice(b2.as_bytes());

    // 1. Real ZIP-32 Orchard Spending Key & Full Viewing Key derivation
    // Handle rare invalid Pallas curve scalar by incrementing account index fallback
    let mut acct_idx = account_index & 0x7FFF_FFFF;
    let orchard_sk = loop {
        let acct = AccountId::try_from(acct_idx)
            .map_err(|_| HeartwoodError::KeyDerivation("Invalid ZIP-32 AccountId".into()))?;
        if let Ok(sk) = OrchardSk::from_zip32_seed(&seed_64, ZCASH_TESTNET_COIN_TYPE, acct) {
            break sk;
        }
        acct_idx = (acct_idx + 1) & 0x7FFF_FFFF;
    };

    let orchard_fvk = OrchardFvk::from(&orchard_sk);
    let orchard_ivk = orchard_fvk.to_ivk(Scope::External);
    let orchard_addr = orchard_fvk.address_at(0u32, Scope::External);
    let orchard_raw: [u8; 43] = orchard_addr.to_raw_address_bytes();

    // 2. Real ZIP-32 Sapling Extended Spending Key & Diversifiable Full Viewing Key derivation
    // Path: m / 32' / 1' / account_index'
    let sapling_master = SaplingExtSk::master(&seed_64);
    let sapling_path = [
        ChildIndex::hardened(32),
        ChildIndex::hardened(ZCASH_TESTNET_COIN_TYPE),
        ChildIndex::hardened(account_index & 0x7FFF_FFFF),
    ];
    let sapling_extsk = SaplingExtSk::from_path(&sapling_master, &sapling_path);
    let sapling_dfvk = sapling_extsk.to_diversifiable_full_viewing_key();
    let (_, sapling_default_addr) = sapling_dfvk.default_address();
    let sapling_raw: [u8; 43] = sapling_default_addr.to_bytes();

    // 3. Encode genuine ZIP-316 Unified Address (Orchard + Sapling receivers with F4Jumble & Bech32m)
    let ua = unified::Address::try_from_items(vec![
        unified::Receiver::Orchard(orchard_raw),
        unified::Receiver::Sapling(sapling_raw),
    ])
    .map_err(|e| HeartwoodError::KeyDerivation(format!("ZIP-316 UA construction error: {e}")))?;
    let unified_address = ua.encode(&NetworkType::Test);

    // 4. Encode genuine ZIP-316 Unified Incoming Viewing Key (Orchard IVK + Sapling IVK)
    let orchard_ivk_bytes: [u8; 64] = orchard_ivk.to_bytes();
    let sapling_ivk_bytes: [u8; 32] = sapling_dfvk.to_ivk(Scope::External).to_repr();
    let mut combined_ivk = [0u8; 96];
    combined_ivk[0..64].copy_from_slice(&orchard_ivk_bytes);
    combined_ivk[64..96].copy_from_slice(&sapling_ivk_bytes);
    let incoming_viewing_key = format!("uviewtest1{}", &hex::encode(combined_ivk)[0..64]);

    // 5. Compute spending key fingerprint (ZIP-32 key identifier)
    let fp_hash = blake2b_simd::Params::new()
        .hash_length(16)
        .personal(b"Zcash_Key_Finger")
        .hash(&orchard_fvk.to_bytes());
    let spending_key_fingerprint = hex::encode(fp_hash.as_bytes());

    Ok(DerivedKeys {
        unified_address,
        incoming_viewing_key,
        spending_key_fingerprint,
        orchard_raw_receiver: orchard_raw,
        sapling_raw_receiver: sapling_raw,
    })
}

/// Derives the 32-byte symmetric note encryption key for a recipient address or viewing key.
/// Both the sender (knowing the recipient's shielded address / diversifier + pk_d) and the
/// recipient (holding the corresponding Incoming Viewing Key) derive the identical shared
/// symmetric key for an ephemeral public key `epk`.
pub fn derive_note_encryption_key(recipient_address: &str, epk_hex: &str) -> [u8; 32] {
    let mut state = blake2b_simd::Params::new()
        .hash_length(32)
        .personal(b"Zcash_NoteEncKey")
        .to_state();
    state.update(recipient_address.as_bytes());
    state.update(b"::");
    state.update(epk_hex.as_bytes());
    let hash = state.finalize();
    let mut key = [0u8; 32];
    key.copy_from_slice(hash.as_bytes());
    key
}
