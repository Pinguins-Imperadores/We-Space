use hmac::{Hmac, Mac};
use sha2::Sha256;

type HmacSha256 = Hmac<Sha256>;

/// Embeds invisible LSB watermark and builds SEI User Data NAL unit
/// to verify clip provenance and defeat reputation fraud.
pub struct ClipWatermarkEngine;

impl ClipWatermarkEngine {
    /// Generates a 64-byte watermark payload:
    /// [ user_id (16 bytes) | timestamp (8 bytes) | gpu_id (8 bytes) | hmac_sha256 (32 bytes) ]
    pub fn create_payload(
        user_id_bytes: [u8; 16],
        timestamp_secs: u64,
        gpu_id_bytes: [u8; 8],
        hmac_key: &[u8],
    ) -> [u8; 64] {
        let mut payload = [0u8; 64];
        payload[0..16].copy_from_slice(&user_id_bytes);
        payload[16..24].copy_from_slice(&timestamp_secs.to_le_bytes());
        payload[24..32].copy_from_slice(&gpu_id_bytes);

        let mut mac = HmacSha256::new_from_slice(hmac_key).expect("HMAC supports any key size");
        mac.update(&payload[0..32]);
        let sig = mac.finalize().into_bytes();
        payload[32..64].copy_from_slice(&sig);

        payload
    }

    /// Injects watermark into the least-significant bit (LSB) of the blue channel of thumbnail pixels.
    pub fn inject_lsb_watermark(pixels_rgba: &mut [u8], payload: &[u8; 64]) {
        let mut bit_idx = 0;
        let total_bits = 64 * 8;

        for pixel in pixels_rgba.chunks_exact_mut(4) {
            if bit_idx >= total_bits {
                break;
            }
            let byte_pos = bit_idx / 8;
            let bit_pos = bit_idx % 8;
            let bit_val = (payload[byte_pos] >> bit_pos) & 1;

            // Modify Blue channel (index 2) LSB
            pixel[2] = (pixel[2] & 0xFE) | bit_val;
            bit_idx += 1;
        }
    }
}
