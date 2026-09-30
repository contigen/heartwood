use rand::RngCore;
use rand::rngs::OsRng;

/// Fills the buffer with cryptographically secure random bytes.
pub fn fill_random(buf: &mut [u8]) {
    OsRng.fill_bytes(buf);
}

/// Generates a vector of cryptographically secure random bytes of specified length.
pub fn random_bytes(len: usize) -> Vec<u8> {
    let mut bytes = vec![0u8; len];
    fill_random(&mut bytes);
    bytes
}

/// Calculates the Shannon entropy of a byte slice in bits per byte (0.0 to 8.0).
/// Pure random noise approaches 8.0 bits/byte.
pub fn shannon_entropy(data: &[u8]) -> f64 {
    if data.is_empty() {
        return 0.0;
    }

    let mut counts = [0usize; 256];
    for &b in data {
        counts[b as usize] += 1;
    }

    let total = data.len() as f64;
    let mut entropy = 0.0;

    for &count in &counts {
        if count > 0 {
            let p = count as f64 / total;
            entropy -= p * p.log2();
        }
    }

    entropy
}

/// Computes the Chi-square statistic against a uniform distribution.
/// Lower values indicate closer adherence to a uniform distribution.
pub fn chi_squared(data: &[u8]) -> f64 {
    if data.is_empty() {
        return 0.0;
    }

    let mut counts = [0usize; 256];
    for &b in data {
        counts[b as usize] += 1;
    }

    let expected = data.len() as f64 / 256.0;
    let mut chi_sq = 0.0;

    for &count in &counts {
        let diff = count as f64 - expected;
        chi_sq += (diff * diff) / expected;
    }

    chi_sq
}
