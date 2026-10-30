use sha2::{Digest, Sha256};

pub struct ClipIntegrity;

impl ClipIntegrity {
    /// Computes SHA-256 hash hex string of video binary data.
    /// Used for x-amz-checksum-sha256 header and R2 edge validation.
    pub fn compute_sha256_hex(data: &[u8]) -> String {
        let mut hasher = Sha256::new();
        hasher.update(data);
        hex::encode(hasher.finalize())
    }
}
