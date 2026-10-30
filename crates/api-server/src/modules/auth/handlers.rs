use crate::state::AppState;
use axum::{extract::State, http::StatusCode, response::IntoResponse, Json};
use shared_types::auth::{AuthResponse, LoginRequest, RegisterRequest};
use uuid::Uuid;

pub async fn register(
    State(state): State<AppState>,
    Json(payload): Json<RegisterRequest>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
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
    let res = sqlx::query!(
        r#"
        INSERT INTO users (id, username, email, password_hash, role, karma_score)
        VALUES ($1, $2, $3, $4, 'PLAYER', 100.00)
        RETURNING id, username, role as "role: String"
        "#,
        user_id,
        payload.username,
        payload.email,
        password_hash
    )
    .fetch_one(&state.db)
    .await;

    match res {
        Ok(user) => {
            let access_token = state
                .crypto
                .generate_access_token(user.id, user.username.clone(), user.role.clone())
                .map_err(|e| {
                    (
                        StatusCode::INTERNAL_SERVER_ERROR,
                        Json(serde_json::json!({ "error": "TOKEN_ERROR", "message": e.to_string() })),
                    )
                })?;

            Ok((
                StatusCode::CREATED,
                Json(AuthResponse {
                    access_token,
                    token_type: "Bearer".into(),
                    expires_in_seconds: 900,
                    user_id: user.id,
                    username: user.username,
                    role: user.role,
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
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let user = sqlx::query!(
        r#"
        SELECT id, username, password_hash, role as "role: String"
        FROM users
        WHERE (username = $1 OR email = $1) AND deleted_at IS NULL
        "#,
        payload.username_or_email
    )
    .fetch_optional(&state.db)
    .await
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "error": "DB_ERROR", "message": e.to_string() })),
        )
    })?;

    let user = match user {
        Some(u) => u,
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

    let is_valid = state
        .crypto
        .verify_password(payload.password, user.password_hash)
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
        .generate_access_token(user.id, user.username.clone(), user.role.clone())
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
        user_id: user.id,
        username: user.username,
        role: user.role,
    }))
}
