/// Multi-modal Trigger Score Aggregator
/// Evaluates:
/// T_score = (0.45 * N_kills) + (0.15 * N_headshots) + (0.60 * I_clutch) + (0.25 * I_audio_spike) + (0.40 * I_ocr_banner)
/// A highlight clip is automatically triggered and flushed when T_score >= 1.0.
#[derive(Debug, Clone, Default)]
pub struct TriggerWeights {
    pub kill_weight: f32,
    pub headshot_weight: f32,
    pub clutch_weight: f32,
    pub audio_spike_weight: f32,
    pub ocr_banner_weight: f32,
    pub threshold: f32,
}

impl TriggerWeights {
    pub fn standard() -> Self {
        Self {
            kill_weight: 0.45,
            headshot_weight: 0.15,
            clutch_weight: 0.60,
            audio_spike_weight: 0.25,
            ocr_banner_weight: 0.40,
            threshold: 1.00,
        }
    }

    pub fn calculate(
        &self,
        kills: u8,
        headshots: u8,
        is_clutch: bool,
        has_audio_spike: bool,
        has_ocr_banner: bool,
    ) -> (f32, bool) {
        let score = (kills as f32 * self.kill_weight)
            + (headshots as f32 * self.headshot_weight)
            + (if is_clutch { self.clutch_weight } else { 0.0 })
            + (if has_audio_spike { self.audio_spike_weight } else { 0.0 })
            + (if has_ocr_banner { self.ocr_banner_weight } else { 0.0 });

        let should_clip = score >= self.threshold;
        (score, should_clip)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_single_kill_without_extra_does_not_trigger() {
        let weights = TriggerWeights::standard();
        let (score, should_clip) = weights.calculate(1, 0, false, false, false);
        assert!((score - 0.45).abs() < 1e-4);
        assert!(!should_clip);
    }

    #[test]
    fn test_double_kill_with_headshot_triggers() {
        let weights = TriggerWeights::standard();
        let (score, should_clip) = weights.calculate(2, 1, false, false, false);
        assert!((score - 1.05).abs() < 1e-4);
        assert!(should_clip);
    }

    #[test]
    fn test_clutch_with_kill_triggers() {
        let weights = TriggerWeights::standard();
        let (score, should_clip) = weights.calculate(1, 0, true, false, false);
        assert!((score - 1.05).abs() < 1e-4);
        assert!(should_clip);
    }

    #[test]
    fn test_audio_spike_and_ocr_banner_trigger() {
        let weights = TriggerWeights::standard();
        let (score, should_clip) = weights.calculate(1, 0, false, true, true);
        assert!((score - 1.10).abs() < 1e-4);
        assert!(should_clip);
    }

    #[test]
    fn test_ace_maximum_score() {
        let weights = TriggerWeights::standard();
        let (score, should_clip) = weights.calculate(5, 5, true, true, true);
        // (5 * 0.45) + (5 * 0.15) + 0.60 + 0.25 + 0.40 = 2.25 + 0.75 + 1.25 = 4.25
        assert!((score - 4.25).abs() < 1e-4);
        assert!(should_clip);
    }
}
