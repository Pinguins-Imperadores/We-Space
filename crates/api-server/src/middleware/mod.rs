pub mod auth_guard;
pub mod rate_limiter;
pub mod sanitize;

pub use auth_guard::auth_guard;
pub use rate_limiter::rate_limit_middleware;
pub use sanitize::*;

use axum::{
    body::Body,
    http::{header, HeaderValue, Request, Response},
    middleware::Next,
};

/// Security Headers Middleware (AppSec Hardening)
/// Injects nosniff, frame denial, strict referrer policy and no-store on sensitive routes.
pub async fn security_headers_middleware(req: Request<Body>, next: Next) -> Response<Body> {
    let uri_path = req.uri().path().to_string();
    let mut res = next.run(req).await;
    let headers = res.headers_mut();

    headers.insert(
        header::HeaderName::from_static("x-content-type-options"),
        HeaderValue::from_static("nosniff"),
    );
    headers.insert(
        header::HeaderName::from_static("x-frame-options"),
        HeaderValue::from_static("DENY"),
    );
    headers.insert(
        header::HeaderName::from_static("referrer-policy"),
        HeaderValue::from_static("strict-origin-when-cross-origin"),
    );

    if uri_path.contains("/auth") || uri_path.contains("/rtc-config") {
        headers.insert(
            header::CACHE_CONTROL,
            HeaderValue::from_static("no-store, no-cache, must-revalidate, max-age=0"),
        );
    }

    res
}
