/// WASAPI Loopback audio trigger engine.
/// Monitors system output for kill sound acoustic signatures and microphone RMS peaks.
pub struct AudioTriggerDetector {
    rms_threshold_db: f32,
}

impl Default for AudioTriggerDetector {
    fn default() -> Self {
        Self {
            rms_threshold_db: -6.0,
        }
    }
}

impl AudioTriggerDetector {
    pub fn new(rms_threshold_db: f32) -> Self {
        Self { rms_threshold_db }
    }

    /// Computes Root Mean Square (RMS) level in decibels from PCM float samples.
    pub fn calculate_rms_db(samples: &[f32]) -> f32 {
        if samples.is_empty() {
            return -100.0;
        }
        let sum_sq: f32 = samples.iter().map(|&s| s * s).sum();
        let rms = (sum_sq / samples.len() as f32).sqrt();
        if rms <= 1e-5 {
            -100.0
        } else {
            20.0 * rms.log10()
        }
    }

    /// Evaluates whether an audio buffer exhibits a voice or kill-sound spike.
    pub fn is_spike(&self, samples: &[f32]) -> bool {
        let db = Self::calculate_rms_db(samples);
        db >= self.rms_threshold_db
    }
}
