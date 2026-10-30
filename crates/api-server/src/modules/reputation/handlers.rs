use super::karma::KarmaCalculationEngine;
use crate::state::AppState;
use axum::{extract::State, http::StatusCode, response::IntoResponse, Json};
use shared_types::reputation::{PostMatchReviewRequest, ReviewOutcomeResponse};
use sqlx::Row;
use uuid::Uuid;

pub async fn submit_review(
    State(state): State<AppState>,
    Json(payload): Json<PostMatchReviewRequest>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let reviewer_id = Uuid::new_v4(); // In production, retrieved from auth TokenClaims

    if reviewer_id == payload.target_id {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({
                "error": "SELF_REVIEW_FORBIDDEN",
                "message": "Players cannot review themselves"
            })),
        ));
    }

    // 1. Fetch reviewer karma and target karma
    let reviewer = sqlx::query(r#"SELECT karma_score::float4 as karma FROM users WHERE id = $1"#)
        .bind(reviewer_id)
        .fetch_optional(&state.db)
        .await
        .unwrap_or(None);

    let reviewer_karma: f32 = reviewer
        .and_then(|r| r.get::<Option<f32>, _>("karma"))
        .unwrap_or(100.0);

    let target = sqlx::query(r#"SELECT karma_score::float4 as karma FROM users WHERE id = $1"#)
        .bind(payload.target_id)
        .fetch_optional(&state.db)
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({ "error": "DB_ERROR", "message": e.to_string() })),
            )
        })?;

    let target_karma: f32 = match target.and_then(|t| t.get::<Option<f32>, _>("karma")) {
        Some(k) => k,
        None => {
            return Err((
                StatusCode::NOT_FOUND,
                Json(serde_json::json!({
                    "error": "TARGET_NOT_FOUND",
                    "message": "Target user does not exist"
                })),
            ))
        }
    };

    // 2. Count reviews between this pair in the last 7 days
    let pair_count = sqlx::query(
        r#"
        SELECT COUNT(*)::int4 as count 
        FROM match_reviews 
        WHERE reviewer_id = $1 AND target_id = $2 
          AND created_at >= NOW() - INTERVAL '7 days'
        "#,
    )
    .bind(reviewer_id)
    .bind(payload.target_id)
    .fetch_one(&state.db)
    .await
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "error": "DB_ERROR", "message": e.to_string() })),
        )
    })?;

    let count: i32 = pair_count.get("count");
    let n_7d = count.max(0) as u32;

    // 3. Compute Delta Karma using KarmaCalculationEngine
    let engine = KarmaCalculationEngine::default();
    let (delta_karma, weight_applied) =
        engine.compute_delta(payload.is_positive, reviewer_karma, n_7d);
    let new_target_karma = KarmaCalculationEngine::apply_bounds(target_karma, delta_karma);

    // 4. Atomic transaction updating review record and target karma
    let review_id = Uuid::new_v4();
    let mut tx = state.db.begin().await.map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "error": "TX_ERROR", "message": e.to_string() })),
        )
    })?;

    sqlx::query(
        r#"
        INSERT INTO match_reviews (
            id, lobby_id, reviewer_id, target_id, is_positive, badges, weight_applied
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        "#,
    )
    .bind(review_id)
    .bind(payload.lobby_id)
    .bind(reviewer_id)
    .bind(payload.target_id)
    .bind(payload.is_positive)
    .bind(&payload.badges)
    .bind(weight_applied as f64)
    .execute(&mut *tx)
    .await
    .map_err(|e| {
        (
            StatusCode::CONFLICT,
            Json(serde_json::json!({
                "error": "ALREADY_REVIEWED",
                "message": format!("Review already submitted for this lobby: {}", e)
            })),
        )
    })?;

    sqlx::query(r#"UPDATE users SET karma_score = $1, updated_at = NOW() WHERE id = $2"#)
        .bind(new_target_karma as f64)
        .bind(payload.target_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({ "error": "UPDATE_ERROR", "message": e.to_string() })),
            )
        })?;

    tx.commit().await.map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "error": "COMMIT_ERROR", "message": e.to_string() })),
        )
    })?;

    Ok(Json(ReviewOutcomeResponse {
        review_id,
        delta_karma,
        weight_applied,
        new_target_karma,
    }))
}
