use axum::{
    body::Body,
    http::{Request, Response, StatusCode},
    middleware::Next,
    response::IntoResponse,
};
use fred::prelude::*;
use std::time::{SystemTime, UNIX_EPOCH};
use uuid::Uuid;

pub const RATE_LIMIT_LUA: &str = include_str!("rate_limit.lua");

pub async fn rate_limit_middleware(
    client: RedisClient,
    key_prefix: &'static str,
    limit: i64,
    window_ms: i64,
    req: Request<Body>,
    next: Next,
) -> Result<Response<Body>, Response<Body>> {
    let client_ip = req
        .headers()
        .get("x-forwarded-for")
        .and_then(|h| h.to_str().ok())
        .unwrap_or("127.0.0.1")
        .split(',')
        .next()
        .unwrap_or("127.0.0.1")
        .trim();

    let redis_key = format!("rl:{}:{}", key_prefix, client_ip);
    let now_ms = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as i64;
    let req_uuid = Uuid::new_v4().to_string();

    let result: Result<Vec<i64>, RedisError> = client
        .eval(
            RATE_LIMIT_LUA,
            vec![redis_key],
            vec![
                now_ms.to_string(),
                window_ms.to_string(),
                limit.to_string(),
                req_uuid,
            ],
        )
        .await;

    match result {
        Ok(res) if res.first().copied() == Some(1) => {
            // Request permitted within limit
            Ok(next.run(req).await)
        }
        Ok(_) => {
            // Rate limit exceeded
            let body = axum::Json(serde_json::json!({
                "error": "TOO_MANY_REQUESTS",
                "message": "Rate limit exceeded. Please retry later.",
                "window_ms": window_ms
            }));
            let mut response = body.into_response();
            *response.status_mut() = StatusCode::TOO_MANY_REQUESTS;
            Err(response)
        }
        Err(e) => {
            // Fallback: If Redis is unavailable, allow request to avoid outage (fail-open for UX)
            tracing::error!("Redis rate limiter failed, falling back to allow: {}", e);
            Ok(next.run(req).await)
        }
    }
}
