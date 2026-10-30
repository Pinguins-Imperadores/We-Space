pub struct KarmaCalculationEngine {
    lambda_decay: f32,
    base_positive: f32,
    base_negative: f32,
}

impl Default for KarmaCalculationEngine {
    fn default() -> Self {
        Self {
            lambda_decay: 0.85,
            base_positive: 1.5,
            base_negative: -3.0,
        }
    }
}

impl KarmaCalculationEngine {
    /// Computes Anti-Brigading Karma Delta:
    /// ΔK = S_base * (K_reviewer / 100)^1.2 * e^(-λ * N_7d)
    /// Clamps resulting karma to [0.00, 200.00].
    pub fn compute_delta(
        &self,
        is_positive: bool,
        reviewer_karma: f32,
        reviews_between_pair_last_7d: u32,
    ) -> (f32, f32) {
        let s_base = if is_positive {
            self.base_positive
        } else {
            self.base_negative
        };

        // Reviewer credibility weight: (K_rev / 100)^1.2
        let credibility_ratio = (reviewer_karma / 100.0).clamp(0.1, 2.0);
        let reviewer_weight = credibility_ratio.powf(1.2);

        // Anti-farming exponential decay between the same pair of players
        let repetition_decay = (-self.lambda_decay * reviews_between_pair_last_7d as f32).exp();

        let weight_applied = reviewer_weight * repetition_decay;
        let delta_karma = s_base * weight_applied;

        (delta_karma, weight_applied)
    }

    pub fn apply_bounds(current_karma: f32, delta: f32) -> f32 {
        (current_karma + delta).clamp(0.0, 200.0)
    }
}
