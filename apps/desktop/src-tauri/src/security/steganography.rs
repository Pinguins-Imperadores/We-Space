#![allow(clippy::chunks_exact_to_as_chunks, clippy::explicit_counter_loop)]

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

    /// Extracts the 64-byte watermark payload from the least-significant bit (LSB) of the blue channel.
    pub fn extract_lsb_watermark(pixels_rgba: &[u8]) -> [u8; 64] {
        let mut payload = [0u8; 64];
        let mut bit_idx = 0;
        let total_bits = 64 * 8;

        for pixel in pixels_rgba.chunks_exact(4) {
            if bit_idx >= total_bits {
                break;
            }
            let byte_pos = bit_idx / 8;
            let bit_pos = bit_idx % 8;
            let bit_val = pixel[2] & 1;

            payload[byte_pos] |= bit_val << bit_pos;
            bit_idx += 1;
        }

        payload
    }

    /// Verifies the cryptographic HMAC-SHA256 signature inside the extracted watermark payload.
    pub fn verify_payload(payload: &[u8; 64], hmac_key: &[u8]) -> bool {
        let mut mac = match HmacSha256::new_from_slice(hmac_key) {
            Ok(m) => m,
            Err(_) => return false,
        };
        mac.update(&payload[0..32]);
        mac.verify_slice(&payload[32..64]).is_ok()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_create_and_verify_payload() {
        let user_id = [1u8; 16];
        let timestamp = 1730300000;
        let gpu_id = [42u8; 8];
        let key = b"wespace_secret_watermark_key_32b";

        let payload = ClipWatermarkEngine::create_payload(user_id, timestamp, gpu_id, key);
        assert!(ClipWatermarkEngine::verify_payload(&payload, key));

        let wrong_key = b"wrong_watermark_key_123456789012";
        assert!(!ClipWatermarkEngine::verify_payload(&payload, wrong_key));
    }

    #[test]
    fn test_inject_and_extract_lsb_watermark() {
        let user_id = [7u8; 16];
        let timestamp = 1730305000;
        let gpu_id = [99u8; 8];
        let key = b"wespace_test_crypto_key_512bits";

        let payload = ClipWatermarkEngine::create_payload(user_id, timestamp, gpu_id, key);

        // Allocate a dummy RGBA image with 1024 pixels (4096 bytes)
        let mut pixels = vec![128u8; 1024 * 4];

        ClipWatermarkEngine::inject_lsb_watermark(&mut pixels, &payload);

        let extracted = ClipWatermarkEngine::extract_lsb_watermark(&pixels);
        assert_eq!(payload, extracted);
        assert!(ClipWatermarkEngine::verify_payload(&extracted, key));
    }

    #[test]
    fn test_lsb_imperceptibility() {
        let user_id = [255u8; 16];
        let timestamp = 1730310000;
        let gpu_id = [0u8; 8];
        let key = b"wespace_key";

        let payload = ClipWatermarkEngine::create_payload(user_id, timestamp, gpu_id, key);
        let original_blue = 200u8;
        let mut pixels = vec![original_blue; 512 * 4];

        ClipWatermarkEngine::inject_lsb_watermark(&mut pixels, &payload);

        for pixel in pixels.chunks_exact(4) {
            let diff = (pixel[2] as i16 - original_blue as i16).abs();
            assert!(diff <= 1, "LSB must only alter color by 0 or 1");
        }
    }
}
