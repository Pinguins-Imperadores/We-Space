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
