use crate::state::AppState;
use axum::{
    extract::{Query, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::Deserialize;
use shared_types::clips::{
    ClipResponse, ClipStatus, CreateClipIntentRequest, PresignedUploadResponse,
};
use shared_types::lfg::GameTitle;
use sqlx::Row;
use uuid::Uuid;

#[derive(Debug, Deserialize)]
pub struct FeedQuery {
    pub game: Option<GameTitle>,
    pub limit: Option<i64>,
}

pub async fn create_clip_intent(
    State(state): State<AppState>,
    Json(payload): Json<CreateClipIntentRequest>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let clip_id = Uuid::new_v4();
    let author_id = Uuid::new_v4(); // In protected route, extracted from TokenClaims
    let object_key = format!("clips/{}/{}.mp4", author_id, clip_id);

    let (upload_url, required_headers) = state.r2.generate_presigned_put_url(
        &object_key,
        &payload.file_sha256,
        15 * 60, // 15 mins expiry
    );

    let game_str = match payload.game {
        GameTitle::Valorant => "VALORANT",
        GameTitle::Cs2 => "CS2",
        GameTitle::Lol => "LOL",
    };

    let res = sqlx::query(
        r#"
        INSERT INTO clips (
            id, author_id, game, title, status, r2_object_key,
            file_sha256, stego_watermark_hash, gpu_encoder_fingerprint,
            trigger_telemetry, duration_ms
        )
        VALUES (
            $1, $2, $3::game_title, $4, 'PENDING_UPLOAD', $5,
            $6, $7, $8, $9, $10
        )
        RETURNING id
        "#,
    )
    .bind(clip_id)
    .bind(author_id)
    .bind(game_str)
    .bind(&payload.title)
    .bind(&object_key)
    .bind(&payload.file_sha256)
    .bind(&payload.stego_watermark_hash)
    .bind(&payload.gpu_encoder_fingerprint)
    .bind(&payload.trigger_telemetry)
    .bind(payload.duration_ms as i32)
    .fetch_one(&state.db)
    .await;

    match res {
        Ok(_) => Ok((
            StatusCode::CREATED,
            Json(PresignedUploadResponse {
                clip_id,
                upload_url,
                r2_object_key: object_key,
                required_headers,
            }),
        )),
        Err(e) => Err((
            StatusCode::CONFLICT,
            Json(serde_json::json!({
                "error": "DUPLICATE_CLIP",
                "message": format!("Clip SHA-256 already registered: {}", e)
            })),
        )),
    }
}

pub async fn get_feed(
    State(state): State<AppState>,
    Query(query): Query<FeedQuery>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let limit = query.limit.unwrap_or(20).min(50);

    let rows = sqlx::query(
        r#"
        SELECT 
            c.id,
            c.author_id,
            u.username as author_username,
            c.game::text as game,
            c.title,
            c.status::text as status,
            c.r2_object_key,
            c.file_sha256,
            c.trigger_telemetry,
            c.duration_ms,
            c.created_at
        FROM clips c
        JOIN users u ON u.id = c.author_id
        WHERE c.status = 'VERIFIED'
        ORDER BY c.created_at DESC
        LIMIT $1
        "#,
    )
    .bind(limit)
    .fetch_all(&state.db)
    .await
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "error": "DB_ERROR", "message": e.to_string() })),
        )
    })?;

    let feed: Vec<ClipResponse> = rows
        .into_iter()
        .map(|r| {
            let game_text: String = r.get("game");
            let r2_key: String = r.get("r2_object_key");
            let dur: i32 = r.get("duration_ms");
            ClipResponse {
                id: r.get("id"),
                author_id: r.get("author_id"),
                author_username: r.get("author_username"),
                game: match game_text.as_str() {
                    "CS2" => GameTitle::Cs2,
                    "LOL" => GameTitle::Lol,
                    _ => GameTitle::Valorant,
                },
                title: r.get("title"),
                status: ClipStatus::Verified,
                video_url: format!("https://cdn.wespace.gg/{}", r2_key),
                file_sha256: r.get("file_sha256"),
                trigger_telemetry: r.get("trigger_telemetry"),
                duration_ms: dur as u32,
                created_at: r.get("created_at"),
            }
        })
        .collect();

    Ok(Json(feed))
}
