use axum::{
    body::Body,
    http::{header, Request, Response, StatusCode},
    middleware::Next,
    response::IntoResponse,
};
use jsonwebtoken::{decode, DecodingKey, Validation};
use shared_types::auth::TokenClaims;

pub async fn auth_guard(
    decoding_key: DecodingKey,
    mut req: Request<Body>,
    next: Next,
) -> Result<Response<Body>, Response<Body>> {
    let auth_header = req
        .headers()
        .get(header::AUTHORIZATION)
        .and_then(|h| h.to_str().ok());

    let token = match auth_header {
        Some(header) if header.starts_with("Bearer ") => &header[7..],
        _ => {
            let error_response = axum::Json(serde_json::json!({
                "error": "UNAUTHORIZED",
                "message": "Missing or malformed Authorization header with Bearer token"
            }))
            .into_response();
            let mut res = error_response;
            *res.status_mut() = StatusCode::UNAUTHORIZED;
            return Err(res);
        }
    };

    let validation = Validation::new(jsonwebtoken::Algorithm::RS256);
    match decode::<TokenClaims>(token, &decoding_key, &validation) {
        Ok(token_data) => {
            req.extensions_mut().insert(token_data.claims);
            Ok(next.run(req).await)
        }
        Err(e) => {
            let error_response = axum::Json(serde_json::json!({
                "error": "INVALID_TOKEN",
                "message": format!("Token verification failed: {}", e)
            }))
            .into_response();
            let mut res = error_response;
            *res.status_mut() = StatusCode::UNAUTHORIZED;
            Err(res)
        }
    }
}
