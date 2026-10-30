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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_engine_positive_first_review() {
        let engine = KarmaCalculationEngine::default();
        let (delta, weight) = engine.compute_delta(true, 100.0, 0);

        assert!((weight - 1.0).abs() < 1e-4);
        assert!((delta - 1.5).abs() < 1e-4);
    }

    #[test]
    fn test_default_engine_negative_review() {
        let engine = KarmaCalculationEngine::default();
        let (delta, weight) = engine.compute_delta(false, 100.0, 0);

        assert!((weight - 1.0).abs() < 1e-4);
        assert!((delta - (-3.0)).abs() < 1e-4);
    }

    #[test]
    fn test_anti_brigading_exponential_decay() {
        let engine = KarmaCalculationEngine::default();
        let (delta_0, _) = engine.compute_delta(true, 100.0, 0);
        let (delta_1, _) = engine.compute_delta(true, 100.0, 1);
        let (delta_3, _) = engine.compute_delta(true, 100.0, 3);
        let (delta_5, _) = engine.compute_delta(true, 100.0, 5);

        assert!(delta_0 > delta_1);
        assert!(delta_1 > delta_3);
        assert!(delta_3 > delta_5);
        assert!(delta_5 < 0.05); // Heavily decayed after 5 reviews in 7 days
    }

    #[test]
    fn test_reviewer_karma_weighting() {
        let engine = KarmaCalculationEngine::default();
        let (delta_high_rep, weight_high) = engine.compute_delta(true, 150.0, 0);
        let (delta_low_rep, weight_low) = engine.compute_delta(true, 60.0, 0);

        assert!(weight_high > 1.0);
        assert!(weight_low < 1.0);
        assert!(delta_high_rep > delta_low_rep);
    }

    #[test]
    fn test_karma_clamping_bounds() {
        assert_eq!(KarmaCalculationEngine::apply_bounds(199.0, 5.0), 200.0);
        assert_eq!(KarmaCalculationEngine::apply_bounds(1.5, -5.0), 0.0);
        assert_eq!(KarmaCalculationEngine::apply_bounds(100.0, 2.5), 102.5);
    }
}
