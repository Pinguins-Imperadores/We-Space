use crate::state::AppState;
use axum::{extract::State, http::StatusCode, response::IntoResponse, Json};
use serde_json::Value;
use shared_types::auth::{AuthResponse, LoginRequest, RegisterRequest};
use sqlx::Row;
use uuid::Uuid;

pub async fn register(
    State(state): State<AppState>,
    Json(payload): Json<RegisterRequest>,
) -> Result<impl IntoResponse, (StatusCode, Json<Value>)> {
    if payload.username.trim().len() < 3 || payload.password.len() < 8 {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({
                "error": "VALIDATION_FAILED",
                "message": "Username must be at least 3 chars and password at least 8 chars"
            })),
        ));
    }

    let password_hash = state
        .crypto
        .hash_password(payload.password)
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({ "error": "HASHING_ERROR", "message": e })),
            )
        })?;

    let user_id = Uuid::new_v4();
    let res = sqlx::query(
        r#"
        INSERT INTO users (id, username, email, password_hash, role, karma_score)
        VALUES ($1, $2, $3, $4, 'PLAYER', 100.00)
        RETURNING id, username, role::text as role
        "#,
    )
    .bind(user_id)
    .bind(&payload.username)
    .bind(&payload.email)
    .bind(&password_hash)
    .fetch_one(&state.db)
    .await;

    match res {
        Ok(row) => {
            let uid: Uuid = row.get("id");
            let uname: String = row.get("username");
            let urole: String = row.get("role");

            let access_token = state
                .crypto
                .generate_access_token(uid, uname.clone(), urole.clone())
                .map_err(|e| {
                    (
                        StatusCode::INTERNAL_SERVER_ERROR,
                        Json(
                            serde_json::json!({ "error": "TOKEN_ERROR", "message": e.to_string() }),
                        ),
                    )
                })?;

            Ok((
                StatusCode::CREATED,
                Json(AuthResponse {
                    access_token,
                    token_type: "Bearer".into(),
                    expires_in_seconds: 900,
                    user_id: uid,
                    username: uname,
                    role: urole,
                }),
            ))
        }
        Err(e) => Err((
            StatusCode::CONFLICT,
            Json(serde_json::json!({
                "error": "USER_EXISTS",
                "message": format!("User or email already registered: {}", e)
            })),
        )),
    }
}

pub async fn login(
    State(state): State<AppState>,
    Json(payload): Json<LoginRequest>,
) -> Result<impl IntoResponse, (StatusCode, Json<Value>)> {
    let row = sqlx::query(
        r#"
        SELECT id, username, password_hash, role::text as role
        FROM users
        WHERE (username = $1 OR email = $1) AND deleted_at IS NULL
        "#,
    )
    .bind(&payload.username_or_email)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "error": "DB_ERROR", "message": e.to_string() })),
        )
    })?;

    let row = match row {
        Some(r) => r,
        None => {
            return Err((
                StatusCode::UNAUTHORIZED,
                Json(serde_json::json!({
                    "error": "INVALID_CREDENTIALS",
                    "message": "Invalid username/email or password"
                })),
            ))
        }
    };

    let user_id: Uuid = row.get("id");
    let username: String = row.get("username");
    let password_hash: String = row.get("password_hash");
    let role: String = row.get("role");

    let is_valid = state
        .crypto
        .verify_password(payload.password, password_hash)
        .await
        .unwrap_or(false);

    if !is_valid {
        return Err((
            StatusCode::UNAUTHORIZED,
            Json(serde_json::json!({
                "error": "INVALID_CREDENTIALS",
                "message": "Invalid username/email or password"
            })),
        ));
    }

    let access_token = state
        .crypto
        .generate_access_token(user_id, username.clone(), role.clone())
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({ "error": "TOKEN_ERROR", "message": e.to_string() })),
            )
        })?;

    Ok(Json(AuthResponse {
        access_token,
        token_type: "Bearer".into(),
        expires_in_seconds: 900,
        user_id,
        username,
        role,
    }))
}
