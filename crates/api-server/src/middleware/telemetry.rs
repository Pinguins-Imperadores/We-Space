use axum::{
    body::Body,
    http::{header, Request, Response, StatusCode},
    middleware::Next,
    response::IntoResponse,
};
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::Instant;

static HTTP_REQUESTS_TOTAL: AtomicU64 = AtomicU64::new(0);
static HTTP_ERRORS_TOTAL: AtomicU64 = AtomicU64::new(0);
static HTTP_DURATION_MS_SUM: AtomicU64 = AtomicU64::new(0);
static HTTP_IN_FLIGHT: AtomicU64 = AtomicU64::new(0);
static AUTH_REQUESTS_TOTAL: AtomicU64 = AtomicU64::new(0);
static LFG_REQUESTS_TOTAL: AtomicU64 = AtomicU64::new(0);
static CLIPS_REQUESTS_TOTAL: AtomicU64 = AtomicU64::new(0);
static REPUTATION_REQUESTS_TOTAL: AtomicU64 = AtomicU64::new(0);

/// Records a single HTTP request telemetry sample into lock-free atomic counters.
pub fn record_request_sample(path: &str, status_code: u16, duration_ms: u64) {
    HTTP_REQUESTS_TOTAL.fetch_add(1, Ordering::Relaxed);
    HTTP_DURATION_MS_SUM.fetch_add(duration_ms, Ordering::Relaxed);

    if status_code >= 400 {
        HTTP_ERRORS_TOTAL.fetch_add(1, Ordering::Relaxed);
    }

    if path.contains("/auth") {
        AUTH_REQUESTS_TOTAL.fetch_add(1, Ordering::Relaxed);
    } else if path.contains("/lfg") {
        LFG_REQUESTS_TOTAL.fetch_add(1, Ordering::Relaxed);
    } else if path.contains("/clips") {
        CLIPS_REQUESTS_TOTAL.fetch_add(1, Ordering::Relaxed);
    } else if path.contains("/reputation") {
        REPUTATION_REQUESTS_TOTAL.fetch_add(1, Ordering::Relaxed);
    }
}

/// Renders all collected Axum telemetry metrics in Prometheus / OpenMetrics text format (v0.0.4).
pub fn render_prometheus_metrics() -> String {
    let total = HTTP_REQUESTS_TOTAL.load(Ordering::Relaxed);
    let errors = HTTP_ERRORS_TOTAL.load(Ordering::Relaxed);
    let duration_sum = HTTP_DURATION_MS_SUM.load(Ordering::Relaxed);
    let in_flight = HTTP_IN_FLIGHT.load(Ordering::Relaxed);
    let auth_total = AUTH_REQUESTS_TOTAL.load(Ordering::Relaxed);
    let lfg_total = LFG_REQUESTS_TOTAL.load(Ordering::Relaxed);
    let clips_total = CLIPS_REQUESTS_TOTAL.load(Ordering::Relaxed);
    let rep_total = REPUTATION_REQUESTS_TOTAL.load(Ordering::Relaxed);

    format!(
        "# HELP wespace_up Whether the We Space Axum API monolith is healthy and scraping (1 = up).\n\
         # TYPE wespace_up gauge\n\
         wespace_up{{region=\"gru\",service=\"wespace-api\"}} 1\n\
         # HELP wespace_http_requests_total Total number of HTTP requests processed by Axum.\n\
         # TYPE wespace_http_requests_total counter\n\
         wespace_http_requests_total {total}\n\
         # HELP wespace_http_errors_total Total number of HTTP 4xx and 5xx error responses.\n\
         # TYPE wespace_http_errors_total counter\n\
         wespace_http_errors_total {errors}\n\
         # HELP wespace_http_request_duration_ms Summary of HTTP request latencies in milliseconds.\n\
         # TYPE wespace_http_request_duration_ms summary\n\
         wespace_http_request_duration_ms_sum {duration_sum}\n\
         wespace_http_request_duration_ms_count {total}\n\
         # HELP wespace_http_in_flight_requests Current number of in-flight HTTP requests.\n\
         # TYPE wespace_http_in_flight_requests gauge\n\
         wespace_http_in_flight_requests {in_flight}\n\
         # HELP wespace_module_requests_total Total HTTP requests partitioned by domain module.\n\
         # TYPE wespace_module_requests_total counter\n\
         wespace_module_requests_total{{module=\"auth\"}} {auth_total}\n\
         wespace_module_requests_total{{module=\"lfg\"}} {lfg_total}\n\
         wespace_module_requests_total{{module=\"clips\"}} {clips_total}\n\
         wespace_module_requests_total{{module=\"reputation\"}} {rep_total}\n"
    )
}

/// Axum middleware that instruments every HTTP request with Prometheus counters and latency tracking.
pub async fn prometheus_metrics_middleware(req: Request<Body>, next: Next) -> Response<Body> {
    let path = req.uri().path().to_string();
    if path == "/metrics" || path == "/api/v1/metrics" {
        return next.run(req).await;
    }

    HTTP_IN_FLIGHT.fetch_add(1, Ordering::Relaxed);
    let start = Instant::now();
    let res = next.run(req).await;
    let elapsed_ms = start.elapsed().as_millis() as u64;
    HTTP_IN_FLIGHT.fetch_sub(1, Ordering::Relaxed);

    record_request_sample(&path, res.status().as_u16(), elapsed_ms);
    res
}

/// Handler for `GET /metrics` and `GET /api/v1/metrics` scraped by Prometheus / Fly.io Grafana.
pub async fn prometheus_metrics_handler() -> impl IntoResponse {
    let body = render_prometheus_metrics();
    let content_type = (
        header::CONTENT_TYPE,
        "text/plain; version=0.0.4; charset=utf-8",
    );
    (StatusCode::OK, [content_type], body)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_prometheus_metrics_exposition_format() {
        record_request_sample("/api/v1/lfg/queue/join", 200, 14);
        record_request_sample("/api/v1/auth/login", 401, 25);

        let output = render_prometheus_metrics();
        assert!(output.contains("wespace_up{region=\"gru\",service=\"wespace-api\"} 1"));
        assert!(output.contains("# TYPE wespace_http_requests_total counter"));
        assert!(output.contains("wespace_module_requests_total{module=\"lfg\"}"));
        assert!(output.contains("wespace_module_requests_total{module=\"auth\"}"));
    }
}
