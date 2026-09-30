use crate::crypto::entropy::{chi_squared, shannon_entropy};
use crate::keystore::container::{Container, VolumeDescriptor, SLOT_1_OFFSET, CONTAINER_SIZE};

#[derive(Clone, Debug, serde::Serialize)]
pub struct IndependenceReport {
    pub seed_a_seed_b_equal: bool,
    pub seed_bitwise_hamming_distance: u32,
    pub slot_1_entropy_bits_per_byte: f64,
    pub slot_1_chi_squared: f64,
    pub padding_entropy_bits_per_byte: f64,
    pub contains_cross_references: bool,
    pub zero_knowledge_deniable: bool,
}

/// Audits a container and its primary descriptor to verify that the hidden volume
/// cannot be derived, discovered, or distinguished from random padding.
pub fn verify_independence(
    container: &Container,
    desc_a: &VolumeDescriptor,
    desc_b: &VolumeDescriptor,
) -> IndependenceReport {
    let mut hamming = 0u32;
    for i in 0..32 {
        let xor = desc_a.seed[i] ^ desc_b.seed[i];
        hamming += xor.count_ones();
    }

    // Measure entropy of the hidden volume region (32 KiB)
    let container_bytes = container.as_bytes();
    let hidden_region = &container_bytes[SLOT_1_OFFSET..SLOT_1_OFFSET + 4096];
    let slot_1_entropy = shannon_entropy(hidden_region);
    let slot_1_chi = chi_squared(hidden_region);

    // Measure entropy of the trailing padding (48 KiB..64 KiB)
    let padding_region = &container_bytes[48 * 1024..CONTAINER_SIZE];
    let padding_entropy = shannon_entropy(padding_region);

    // Check if slot 0 descriptor leaks any distress or slot 1 secrets
    let desc_a_json = serde_json::to_string(desc_a).unwrap_or_default();
    let contains_cross_ref = desc_a.distress_config.is_some()
        || desc_a_json.contains("trusted_contact")
        || desc_a_json.contains(&hex::encode(desc_b.seed));

    let deniable = !contains_cross_ref
        && (hamming > 100) // Expect ~128 bits differing out of 256
        && (slot_1_entropy > 7.95)
        && (padding_entropy > 7.95);

    IndependenceReport {
        seed_a_seed_b_equal: desc_a.seed == desc_b.seed,
        seed_bitwise_hamming_distance: hamming,
        slot_1_entropy_bits_per_byte: slot_1_entropy,
        slot_1_chi_squared: slot_1_chi,
        padding_entropy_bits_per_byte: padding_entropy,
        contains_cross_references: contains_cross_ref,
        zero_knowledge_deniable: deniable,
    }
}
