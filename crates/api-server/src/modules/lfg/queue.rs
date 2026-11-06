use crate::state::AppState;
use axum::{
    extract::{Extension, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use fred::prelude::*;
use serde_json::json;
use shared_types::auth::TokenClaims;
use shared_types::lfg::{
    calculate_weighted_score, BatchMatchmakingResponse, CommStyle, DuoMatchResult, GameTitle,
    JoinQueueRequest, LeaveQueueRequest, QueueStatusResponse, QueueTicket,
};
use sqlx::Row;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use uuid::Uuid;

const QUEUE_KEY_PREFIX: &str = "lfg:queue";
const TICKET_KEY_PREFIX: &str = "lfg:ticket";
const PLAYER_MAP_PREFIX: &str = "lfg:player_queue";
const TICKET_TTL_SECONDS: i64 = 600; // 10 minutes auto-expiry for stale queue entries

/// Base behavioral score proximity tolerance (strict match initially)
const BASE_SCORE_TOLERANCE: f64 = 15.0;
/// Rate at which tolerance window widens per second in queue
const TOLERANCE_GROWTH_PER_SEC: f64 = 0.75;
/// Maximum score tolerance window allowed
const MAX_SCORE_TOLERANCE: f64 = 65.0;

fn queue_key_for_game(game: GameTitle) -> String {
    let g = match game {
        GameTitle::Valorant => "VALORANT",
        GameTitle::Cs2 => "CS2",
        GameTitle::Lol => "LOL",
    };
    format!("{}:{}", QUEUE_KEY_PREFIX, g)
}

fn game_from_str(s: &str) -> GameTitle {
    match s.to_uppercase().as_str() {
        "CS2" => GameTitle::Cs2,
        "LOL" => GameTitle::Lol,
        _ => GameTitle::Valorant,
    }
}

fn current_timestamp_secs() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64
}

/// Dynamic tolerance calculation expanding over wait time
pub fn calculate_dynamic_tolerance(wait_seconds: u64) -> f64 {
    let expansion = (wait_seconds as f64) * TOLERANCE_GROWTH_PER_SEC;
    (BASE_SCORE_TOLERANCE + expansion).min(MAX_SCORE_TOLERANCE)
}

/// Handler: Join the Redis In-Memory Weighted Queue
pub async fn join_queue_handler(
    State(state): State<AppState>,
    claims: Option<Extension<TokenClaims>>,
    Json(payload): Json<JoinQueueRequest>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let user_id = claims
        .map(|c| c.0.sub)
        .unwrap_or_else(Uuid::new_v4);

    // Fetch user details & karma from PostgreSQL if available
    let user_row = sqlx::query(
        r#"
        SELECT 
            u.username,
            COALESCE(u.karma_score::float4, 100.0) as karma_score,
            COALESCE(p.rank_tier, 15) as rank_tier,
            COALESCE(p.primary_role, 'Flex') as primary_role
        FROM users u
        LEFT JOIN player_game_profiles p ON p.user_id = u.id AND p.game = $2::game_title
        WHERE u.id = $1 AND u.deleted_at IS NULL
        LIMIT 1
        "#,
    )
    .bind(user_id)
    .bind(match payload.game {
        GameTitle::Valorant => "VALORANT",
        GameTitle::Cs2 => "CS2",
        GameTitle::Lol => "LOL",
    })
    .fetch_optional(&state.db)
    .await
    .unwrap_or(None);

    let (username, karma_score, rank_tier, primary_role) = if let Some(r) = user_row {
        (
            r.get::<String, _>("username"),
            r.get::<f32, _>("karma_score"),
            payload.rank_tier.unwrap_or_else(|| r.get::<i16, _>("rank_tier")),
            payload.primary_role.unwrap_or_else(|| r.get::<String, _>("primary_role")),
        )
    } else {
        (
            format!("Agent_{}", &user_id.to_string()[..6]),
            100.0f32,
            payload.rank_tier.unwrap_or(15),
            payload.primary_role.unwrap_or_else(|| "Flex".into()),
        )
    };

    let weighted_score = calculate_weighted_score(rank_tier, karma_score);
    let now = current_timestamp_secs();

    let ticket = QueueTicket {
        user_id,
        username,
        game: payload.game,
        rank_tier,
        primary_role,
        comm_preferences: payload.comm_preferences.unwrap_or_else(|| vec![CommStyle::CleanCalls]),
        karma_score,
        joined_at: now,
        weighted_score,
    };

    let queue_key = queue_key_for_game(payload.game);
    let ticket_key = format!("{}:{}", TICKET_KEY_PREFIX, user_id);
    let player_map_key = format!("{}:{}", PLAYER_MAP_PREFIX, user_id);
    let user_id_str = user_id.to_string();

    let ticket_json = serde_json::to_string(&ticket).map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": "SERIALIZE_ERROR", "message": e.to_string() })),
        )
    })?;

    // 1. Add player to Redis Sorted Set by weighted score (ZADD)
    let zadd_res: Result<(), RedisError> = state
        .redis
        .zadd(
            queue_key.clone(),
            None,
            None,
            false,
            false,
            (weighted_score, user_id_str.clone()),
        )
        .await;

    if let Err(e) = zadd_res {
        tracing::error!("Redis ZADD failed for user {}: {}", user_id, e);
        return Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": "REDIS_ERROR", "message": "Failed to enqueue player" })),
        ));
    }

    // 2. Persist ticket with TTL in Redis
    let _: Result<(), _> = state
        .redis
        .set(
            ticket_key,
            ticket_json,
            Some(Expiration::EX(TICKET_TTL_SECONDS)),
            None,
            false,
        )
        .await;

    // 3. Persist reverse map player -> game queue
    let game_str = match payload.game {
        GameTitle::Valorant => "VALORANT",
        GameTitle::Cs2 => "CS2",
        GameTitle::Lol => "LOL",
    };
    let _: Result<(), _> = state
        .redis
        .set(
            player_map_key,
            game_str,
            Some(Expiration::EX(TICKET_TTL_SECONDS)),
            None,
            false,
        )
        .await;

    tracing::info!(
        "Player {} joined queue for {:?} with weighted score {:.2} (rank={}, karma={:.1})",
        user_id,
        payload.game,
        weighted_score,
        rank_tier,
        karma_score
    );

    Ok(Json(ticket))
}

/// Handler: Leave the Redis In-Memory Queue
pub async fn leave_queue_handler(
    State(state): State<AppState>,
    claims: Option<Extension<TokenClaims>>,
    Json(payload): Json<Option<LeaveQueueRequest>>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let user_id = claims
        .map(|c| c.0.sub)
        .unwrap_or_else(Uuid::new_v4);

    let player_map_key = format!("{}:{}", PLAYER_MAP_PREFIX, user_id);
    let game_title = if let Some(p) = payload {
        p.game
    } else {
        let stored_game: Option<String> = state.redis.get(player_map_key.clone()).await.unwrap_or(None);
        stored_game
            .map(|s| game_from_str(&s))
            .unwrap_or(GameTitle::Valorant)
    };

    let queue_key = queue_key_for_game(game_title);
    let ticket_key = format!("{}:{}", TICKET_KEY_PREFIX, user_id);
    let user_id_str = user_id.to_string();

    let _: Result<i64, _> = state.redis.zrem(queue_key, vec![user_id_str]).await;
    let _: Result<(), _> = state.redis.del(vec![ticket_key, player_map_key]).await;

    tracing::info!("Player {} left queue for {:?}", user_id, game_title);

    Ok(Json(json!({
        "status": "LEFT_QUEUE",
        "user_id": user_id,
        "game": game_title
    })))
}

/// Handler: Check player queue status, wait time, and current tolerance window
pub async fn get_queue_status_handler(
    State(state): State<AppState>,
    claims: Option<Extension<TokenClaims>>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let user_id = claims
        .map(|c| c.0.sub)
        .unwrap_or_else(Uuid::new_v4);

    let player_map_key = format!("{}:{}", PLAYER_MAP_PREFIX, user_id);
    let stored_game: Option<String> = state.redis.get(player_map_key).await.unwrap_or(None);

    let game = match stored_game {
        Some(ref g) => game_from_str(g),
        None => {
            return Ok(Json(QueueStatusResponse {
                in_queue: false,
                game: None,
                position: None,
                total_in_queue: 0,
                elapsed_seconds: None,
                current_tolerance: None,
                weighted_score: None,
            }));
        }
    };

    let queue_key = queue_key_for_game(game);
    let ticket_key = format!("{}:{}", TICKET_KEY_PREFIX, user_id);
    let user_id_str = user_id.to_string();

    let total: usize = state.redis.zcard(queue_key.clone()).await.unwrap_or(0);
    let rank_opt: Option<usize> = state.redis.zrank(queue_key, user_id_str, false).await.unwrap_or(None);

    let ticket_json: Option<String> = state.redis.get(ticket_key).await.unwrap_or(None);
    let ticket: Option<QueueTicket> = ticket_json.and_then(|s| serde_json::from_str(&s).ok());

    let (elapsed_seconds, current_tolerance, weighted_score) = if let Some(t) = ticket {
        let now = current_timestamp_secs();
        let elapsed = (now - t.joined_at).max(0) as u64;
        let tol = calculate_dynamic_tolerance(elapsed);
        (Some(elapsed), Some(tol), Some(t.weighted_score))
    } else {
        (None, None, None)
    };

    Ok(Json(QueueStatusResponse {
        in_queue: rank_opt.is_some(),
        game: Some(game),
        position: rank_opt.map(|r| r + 1),
        total_in_queue: total,
        elapsed_seconds,
        current_tolerance,
        weighted_score,
    }))
}

/// Core Batch Matchmaker Algorithm:
/// Scans the Redis Sorted Set in batches and pairs adjacent duos within the behavioral proximity tolerance.
pub async fn run_batch_matchmaking(
    redis: &RedisClient,
    nats: &async_nats::Client,
    game: GameTitle,
) -> Result<BatchMatchmakingResponse, RedisError> {
    let queue_key = queue_key_for_game(game);

    // 1. Fetch all queued players ordered by weighted score (ZRANGE 0 -1 WITHSCORES)
    let entries: Vec<(String, f64)> = redis
        .zrange(queue_key.clone(), 0, -1, false, false, None, true)
        .await
        .unwrap_or_default();

    let total_in_queue = entries.len();
    if total_in_queue < 2 {
        return Ok(BatchMatchmakingResponse {
            game,
            matched_duos: Vec::new(),
            remaining_in_queue: total_in_queue,
            batch_timestamp: current_timestamp_secs(),
        });
    }

    let now = current_timestamp_secs();
    let mut matched_duos: Vec<DuoMatchResult> = Vec::new();
    let mut matched_user_ids: Vec<String> = Vec::new();

    let mut i = 0;
    while i + 1 < entries.len() {
        let (ref user_a_str, score_a) = entries[i];
        let (ref user_b_str, score_b) = entries[i + 1];

        if matched_user_ids.contains(user_a_str) {
            i += 1;
            continue;
        }

        // Fetch tickets from Redis
        let ticket_a_key = format!("{}:{}", TICKET_KEY_PREFIX, user_a_str);
        let ticket_b_key = format!("{}:{}", TICKET_KEY_PREFIX, user_b_str);

        let ticket_a_str: Option<String> = redis.get(ticket_a_key).await.unwrap_or(None);
        let ticket_b_str: Option<String> = redis.get(ticket_b_key).await.unwrap_or(None);

        if let (Some(a_str), Some(b_str)) = (ticket_a_str, ticket_b_str) {
            if let (Ok(ticket_a), Ok(ticket_b)) = (
                serde_json::from_str::<QueueTicket>(&a_str),
                serde_json::from_str::<QueueTicket>(&b_str),
            ) {
                let wait_a = (now - ticket_a.joined_at).max(0) as u64;
                let wait_b = (now - ticket_b.joined_at).max(0) as u64;
                let max_wait = wait_a.max(wait_b);

                let dynamic_tol = calculate_dynamic_tolerance(max_wait);
                let score_delta = (score_b - score_a).abs();

                // Check behavioral and skill proximity threshold
                if score_delta <= dynamic_tol {
                    let match_id = Uuid::new_v4();
                    let lobby_id = Uuid::new_v4();

                    let duo_match = DuoMatchResult {
                        match_id,
                        lobby_id,
                        game,
                        player_a: ticket_a.clone(),
                        player_b: ticket_b.clone(),
                        score_delta,
                        matched_at: now,
                    };

                    matched_user_ids.push(user_a_str.clone());
                    matched_user_ids.push(user_b_str.clone());
                    matched_duos.push(duo_match.clone());

                    // Publish match found notifications via NATS for both players
                    let nats_payload_a = json!({
                        "event": "DUO_MATCH_FOUND",
                        "match_id": match_id,
                        "lobby_id": lobby_id,
                        "game": game,
                        "partner": {
                            "user_id": ticket_b.user_id,
                            "username": ticket_b.username,
                            "rank_tier": ticket_b.rank_tier,
                            "primary_role": ticket_b.primary_role,
                            "karma_score": ticket_b.karma_score,
                            "comm_preferences": ticket_b.comm_preferences
                        },
                        "score_delta": score_delta,
                        "timestamp": now
                    });

                    let nats_payload_b = json!({
                        "event": "DUO_MATCH_FOUND",
                        "match_id": match_id,
                        "lobby_id": lobby_id,
                        "game": game,
                        "partner": {
                            "user_id": ticket_a.user_id,
                            "username": ticket_a.username,
                            "rank_tier": ticket_a.rank_tier,
                            "primary_role": ticket_a.primary_role,
                            "karma_score": ticket_a.karma_score,
                            "comm_preferences": ticket_a.comm_preferences
                        },
                        "score_delta": score_delta,
                        "timestamp": now
                    });

                    let _ = nats
                        .publish(
                            format!("user.{}.match_found", ticket_a.user_id),
                            nats_payload_a.to_string().into(),
                        )
                        .await;

                    let _ = nats
                        .publish(
                            format!("user.{}.match_found", ticket_b.user_id),
                            nats_payload_b.to_string().into(),
                        )
                        .await;

                    let _ = nats
                        .publish(
                            format!("lobby.{}", lobby_id),
                            json!({
                                "event": "LOBBY_CREATED",
                                "lobby_id": lobby_id,
                                "game": game,
                                "players": [ticket_a.user_id, ticket_b.user_id]
                            })
                            .to_string()
                            .into(),
                        )
                        .await;

                    tracing::info!(
                        "Matched Duo [{} & {}] in {:?} (Δscore={:.2}, tol={:.2}, lobby={})",
                        ticket_a.username,
                        ticket_b.username,
                        game,
                        score_delta,
                        dynamic_tol,
                        lobby_id
                    );

                    // Skip the matched duo
                    i += 2;
                    continue;
                }
            }
        }
        i += 1;
    }

    // Atomically remove all matched players from the Redis Sorted Set
    if !matched_user_ids.is_empty() {
        let _: Result<i64, _> = redis.zrem(queue_key.clone(), matched_user_ids.clone()).await;

        for uid in &matched_user_ids {
            let ticket_key = format!("{}:{}", TICKET_KEY_PREFIX, uid);
            let player_map_key = format!("{}:{}", PLAYER_MAP_PREFIX, uid);
            let _: Result<(), _> = redis.del(vec![ticket_key, player_map_key]).await;
        }
    }

    let remaining: usize = redis.zcard(queue_key).await.unwrap_or(0);

    Ok(BatchMatchmakingResponse {
        game,
        matched_duos,
        remaining_in_queue: remaining,
        batch_timestamp: now,
    })
}

/// Handler: Trigger batch matchmaking cycle on demand
pub async fn batch_match_handler(
    State(state): State<AppState>,
    Json(payload): Json<JoinQueueRequest>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    match run_batch_matchmaking(&state.redis, &state.nats, payload.game).await {
        Ok(res) => Ok(Json(res)),
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": "BATCH_MATCH_ERROR", "message": e.to_string() })),
        )),
    }
}

/// Periodic Background Worker: Automatically runs batch matchmaking cycles
pub async fn start_batch_matchmaking_worker(
    redis: RedisClient,
    nats: async_nats::Client,
    _db: sqlx::PgPool,
) {
    tracing::info!("Starting We Space Redis Batch Matchmaker Worker (2.5s loop)...");
    let mut interval = tokio::time::interval(Duration::from_millis(2500));

    let games = [GameTitle::Valorant, GameTitle::Cs2, GameTitle::Lol];

    loop {
        interval.tick().await;

        for &game in &games {
            if let Err(e) = run_batch_matchmaking(&redis, &nats, game).await {
                tracing::debug!("Batch matchmaking tick for {:?} produced: {}", game, e);
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_calculate_dynamic_tolerance_expansion() {
        // Initial tolerance at 0 seconds
        let tol_0 = calculate_dynamic_tolerance(0);
        assert!((tol_0 - 15.0).abs() < 1e-4);

        // Tolerance at 10 seconds (15.0 + 10 * 0.75 = 22.5)
        let tol_10 = calculate_dynamic_tolerance(10);
        assert!((tol_10 - 22.5).abs() < 1e-4);

        // Tolerance at 20 seconds (15.0 + 20 * 0.75 = 30.0)
        let tol_20 = calculate_dynamic_tolerance(20);
        assert!((tol_20 - 30.0).abs() < 1e-4);

        // Tolerance cap at 100 seconds (capped at 65.0)
        let tol_100 = calculate_dynamic_tolerance(100);
        assert!((tol_100 - 65.0).abs() < 1e-4);
    }

    #[test]
    fn test_queue_key_generation() {
        assert_eq!(queue_key_for_game(GameTitle::Valorant), "lfg:queue:VALORANT");
        assert_eq!(queue_key_for_game(GameTitle::Cs2), "lfg:queue:CS2");
        assert_eq!(queue_key_for_game(GameTitle::Lol), "lfg:queue:LOL");
    }

    #[test]
    fn test_proximity_delta_evaluation() {
        let score_a = calculate_weighted_score(20, 95.0); // 400 + 95 = 495.0
        let score_b = calculate_weighted_score(20, 97.5); // 400 + 97.5 = 497.5
        let score_far = calculate_weighted_score(25, 95.0); // 500 + 95 = 595.0

        let delta_close = (score_b - score_a).abs();
        let delta_far = (score_far - score_a).abs();

        let initial_tol = calculate_dynamic_tolerance(0); // 15.0
        let max_tol = calculate_dynamic_tolerance(100); // 65.0

        assert!(delta_close <= initial_tol, "Close peers must match immediately");
        assert!(delta_far > max_tol, "Divergent ranks must never match outside max tolerance");
    }
}
