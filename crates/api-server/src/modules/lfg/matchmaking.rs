use crate::state::AppState;
use axum::{
    extract::{Query, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::Deserialize;
use shared_types::lfg::{CommStyle, GameTitle, LfgPlayerProfile};
use sqlx::Row;
use uuid::Uuid;

#[derive(Debug, Deserialize)]
pub struct LfgSearchQuery {
    pub game: GameTitle,
    pub rank_min: Option<i16>,
    pub rank_max: Option<i16>,
    pub primary_role: Option<String>,
    pub clean_calls_only: Option<bool>,
}

pub async fn search_duos(
    State(state): State<AppState>,
    Query(query): Query<LfgSearchQuery>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let game_str = match query.game {
        GameTitle::Valorant => "VALORANT",
        GameTitle::Cs2 => "CS2",
        GameTitle::Lol => "LOL",
    };

    let rank_min = query.rank_min.unwrap_or(1);
    let rank_max = query.rank_max.unwrap_or(30);

    let rows = sqlx::query(
        r#"
        SELECT 
            p.user_id,
            u.username,
            p.rank_tier,
            p.primary_role,
            u.karma_score::float4 as karma_score
        FROM player_game_profiles p
        JOIN users u ON u.id = p.user_id
        WHERE p.game = $1::game_title
          AND p.looking_for_group = TRUE
          AND p.rank_tier BETWEEN $2 AND $3
          AND u.deleted_at IS NULL
        ORDER BY u.karma_score DESC
        LIMIT 50
        "#,
    )
    .bind(game_str)
    .bind(rank_min)
    .bind(rank_max)
    .fetch_all(&state.db)
    .await
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "error": "DB_ERROR", "message": e.to_string() })),
        )
    })?;

    let profiles: Vec<LfgPlayerProfile> = rows
        .into_iter()
        .map(|r| {
            let karma: Option<f32> = r.get("karma_score");
            LfgPlayerProfile {
                user_id: r.get("user_id"),
                username: r.get("username"),
                game: query.game,
                rank_tier: r.get("rank_tier"),
                primary_role: r.get("primary_role"),
                comm_preferences: vec![CommStyle::CleanCalls],
                karma_score: karma.unwrap_or(100.0),
                looking_for_group: true,
            }
        })
        .collect();

    Ok(Json(profiles))
}
