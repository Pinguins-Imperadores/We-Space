/// Fast ROI (Region of Interest) OCR engine for killfeed and elimination banners.
/// Restricts image processing to a 300x80px crop (at 1080p baseline) to keep CPU usage < 1%.
/// Automatically scales vertically and centers horizontally for 4K (16:9) and Ultrawide (21:9) monitors.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct FastRoiOcr {
    pub crop_x: u32,
    pub crop_y: u32,
    pub crop_width: u32,
    pub crop_height: u32,
}

impl Default for FastRoiOcr {
    fn default() -> Self {
        Self::for_resolution(1920, 1080)
    }
}

impl FastRoiOcr {
    const BASE_HEIGHT: f32 = 1080.0;
    const BASE_CROP_WIDTH: f32 = 300.0;
    const BASE_CROP_HEIGHT: f32 = 80.0;
    const BASE_CROP_Y: f32 = 840.0;
    const BANNER_DENSITY_THRESHOLD: f32 = 0.12;

    /// Computes the dynamically scaled ROI for a given monitor resolution.
    ///
    /// Competitive HUDs (Valorant / CS2) scale HUD elements proportionally to vertical height
    /// while keeping the elimination banner horizontally centered (preserving the 16:9 safe zone
    /// on 21:9 Ultrawide and 32:9 Super-Ultrawide displays without horizontal stretching).
    pub fn for_resolution(width: u32, height: u32) -> Self {
        if width == 0 || height == 0 {
            return Self {
                crop_x: 0,
                crop_y: 0,
                crop_width: 0,
                crop_height: 0,
            };
        }

        let scale_y = height as f32 / Self::BASE_HEIGHT;

        let crop_width = ((Self::BASE_CROP_WIDTH * scale_y).round() as u32).clamp(1, width);
        let crop_height = ((Self::BASE_CROP_HEIGHT * scale_y).round() as u32).clamp(1, height);

        let crop_x = (width - crop_width) / 2;
        let crop_y = ((Self::BASE_CROP_Y * scale_y).round() as u32).min(height - crop_height);

        Self {
            crop_x,
            crop_y,
            crop_width,
            crop_height,
        }
    }

    /// Resolves the effective ROI for the incoming frame dimensions.
    pub fn effective_roi(&self, width: u32, height: u32) -> Self {
        let is_default_1080p = self.crop_x == 810
            && self.crop_y == 840
            && self.crop_width == 300
            && self.crop_height == 80;

        if (is_default_1080p && (width != 1920 || height != 1080))
            || self.crop_x.saturating_add(self.crop_width) > width
            || self.crop_y.saturating_add(self.crop_height) > height
        {
            Self::for_resolution(width, height)
        } else {
            *self
        }
    }

    /// Fast color histogram + threshold verification in cropped ROI.
    /// In full native runtime, pre-filters frames before lightweight Tesseract / ONNX ROI classification.
    pub fn detect_kill_banner(&self, rgba_pixels: &[u8], width: u32, height: u32) -> bool {
        if width == 0 || height == 0 {
            return false;
        }

        let expected_bytes = (width as usize)
            .saturating_mul(height as usize)
            .saturating_mul(4);
        if rgba_pixels.len() < expected_bytes {
            return false;
        }

        let roi = self.effective_roi(width, height);
        if roi.crop_width == 0 || roi.crop_height == 0 {
            return false;
        }

        let total_roi_pixels = (roi.crop_width as usize) * (roi.crop_height as usize);
        let mut banner_accent_pixels: usize = 0;
        let row_stride = (width as usize) * 4;

        for y in roi.crop_y..(roi.crop_y + roi.crop_height) {
            let row_offset = (y as usize) * row_stride;
            for x in roi.crop_x..(roi.crop_x + roi.crop_width) {
                let idx = row_offset + (x as usize) * 4;
                let r = rgba_pixels[idx];
                let g = rgba_pixels[idx + 1];
                let b = rgba_pixels[idx + 2];
                let a = rgba_pixels[idx + 3];

                // Matches high-luminance red/gold/white elimination banner highlights
                if a >= 128 && r >= 200 && (g >= 180 || b <= 100) {
                    banner_accent_pixels += 1;
                }
            }
        }

        let density = banner_accent_pixels as f32 / total_roi_pixels as f32;
        density >= Self::BANNER_DENSITY_THRESHOLD
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_roi_default_1080p_16_9() {
        let roi = FastRoiOcr::default();
        assert_eq!(roi.crop_x, 810);
        assert_eq!(roi.crop_y, 840);
        assert_eq!(roi.crop_width, 300);
        assert_eq!(roi.crop_height, 80);
    }

    #[test]
    fn test_roi_4k_uhd_3840x2160() {
        let roi = FastRoiOcr::for_resolution(3840, 2160);
        // 2x vertical & horizontal scale from 1080p
        assert_eq!(roi.crop_width, 600);
        assert_eq!(roi.crop_height, 160);
        assert_eq!(roi.crop_x, 1620); // (3840 - 600) / 2
        assert_eq!(roi.crop_y, 1680); // 840 * 2
    }

    #[test]
    fn test_roi_ultrawide_21_9_wfhd_2560x1080() {
        let roi = FastRoiOcr::for_resolution(2560, 1080);
        // Same height as 1080p (300x80 at y=840), horizontally centered for 2560px width
        assert_eq!(roi.crop_width, 300);
        assert_eq!(roi.crop_height, 80);
        assert_eq!(roi.crop_x, 1130); // (2560 - 300) / 2
        assert_eq!(roi.crop_y, 840);
    }

    #[test]
    fn test_roi_ultrawide_21_9_wqhd_3440x1440() {
        let roi = FastRoiOcr::for_resolution(3440, 1440);
        // Scale factor = 1440 / 1080 = 1.3333...
        assert_eq!(roi.crop_width, 400); // round(300 * 4/3)
        assert_eq!(roi.crop_height, 107); // round(80 * 4/3)
        assert_eq!(roi.crop_x, 1520); // (3440 - 400) / 2
        assert_eq!(roi.crop_y, 1120); // round(840 * 4/3)
    }

    #[test]
    fn test_roi_ultrawide_21_9_5k2k_5120x2160() {
        let roi = FastRoiOcr::for_resolution(5120, 2160);
        assert_eq!(roi.crop_width, 600);
        assert_eq!(roi.crop_height, 160);
        assert_eq!(roi.crop_x, 2260); // (5120 - 600) / 2
        assert_eq!(roi.crop_y, 1680);
    }

    #[test]
    fn test_detect_kill_banner_on_ultrawide_and_4k_frames() {
        let ocr = FastRoiOcr::default();

        // 1. Test Ultrawide 2560x1080 frame with kill banner in centered ROI
        let width = 2560u32;
        let height = 1080u32;
        let mut frame = vec![0u8; (width * height * 4) as usize];

        // Dark background Frame -> should not trigger
        assert!(!ocr.detect_kill_banner(&frame, width, height));

        // Paint banner pixels at the old hardcoded 1080p x=810 (off-center for 2560x1080)
        // Only a small overlap with [1130..1430] (none at all since 810 + 300 = 1110 < 1130)
        for y in 840..920 {
            for x in 810..1110 {
                let idx = ((y * width + x) * 4) as usize;
                frame[idx] = 255;
                frame[idx + 1] = 215;
                frame[idx + 2] = 0;
                frame[idx + 3] = 255;
            }
        }
        assert!(
            !ocr.detect_kill_banner(&frame, width, height),
            "Off-center 16:9 coordinates must not false-trigger on 21:9 Ultrawide"
        );

        // Paint banner pixels inside the true 21:9 centered ROI [1130..1430, 840..920] (25% fill)
        for y in 850..890 {
            for x in 1200..1350 {
                let idx = ((y * width + x) * 4) as usize;
                frame[idx] = 240;
                frame[idx + 1] = 40;
                frame[idx + 2] = 40;
                frame[idx + 3] = 255;
            }
        }
        assert!(
            ocr.detect_kill_banner(&frame, width, height),
            "Centered kill banner on 21:9 Ultrawide must be detected"
        );
    }

    #[test]
    fn test_detect_kill_banner_rejects_invalid_buffers() {
        let ocr = FastRoiOcr::default();
        assert!(!ocr.detect_kill_banner(&[], 1920, 1080));
        assert!(!ocr.detect_kill_banner(&[255; 100], 0, 1080));
        assert!(!ocr.detect_kill_banner(&[255; 100], 1920, 0));
    }
}
