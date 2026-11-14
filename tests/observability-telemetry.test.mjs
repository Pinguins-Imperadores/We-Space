import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

test('Observabilidade: Axum expõe /metrics e middleware de telemetria Prometheus sem warnings', () => {
  const telemetryRs = fs.readFileSync(
    path.join(rootDir, 'crates/api-server/src/middleware/telemetry.rs'),
    'utf8'
  );
  const mainRs = fs.readFileSync(
    path.join(rootDir, 'crates/api-server/src/main.rs'),
    'utf8'
  );

  assert.ok(telemetryRs.includes('pub fn render_prometheus_metrics() -> String'));
  assert.ok(telemetryRs.includes('pub async fn prometheus_metrics_middleware'));
  assert.ok(telemetryRs.includes('pub async fn prometheus_metrics_handler'));
  assert.ok(telemetryRs.includes('text/plain; version=0.0.4; charset=utf-8'));

  assert.ok(mainRs.includes('.route("/metrics", get(crate::middleware::prometheus_metrics_handler))'));
  assert.ok(mainRs.includes('crate::middleware::prometheus_metrics_middleware'));
});

test('Observabilidade: Sincronia entre fly.toml [metrics], prometheus.yml, otel-collector.yaml e Grafana Dashboard', () => {
  const flyToml = fs.readFileSync(path.join(rootDir, 'fly.toml'), 'utf8');
  const promYml = fs.readFileSync(
    path.join(rootDir, 'infra/observability/prometheus.yml'),
    'utf8'
  );
  const otelYml = fs.readFileSync(
    path.join(rootDir, 'infra/observability/otel-collector.yaml'),
    'utf8'
  );
  const grafanaJson = JSON.parse(
    fs.readFileSync(
      path.join(rootDir, 'infra/observability/grafana-dashboard.json'),
      'utf8'
    )
  );

  assert.ok(flyToml.includes('[metrics]'));
  assert.ok(flyToml.includes('path = "/metrics"'));

  assert.ok(promYml.includes('job_name: "wespace-api"'));
  assert.ok(promYml.includes('metrics_path: "/metrics"'));
  assert.ok(promYml.includes('job_name: "otel-collector"'));
  assert.ok(promYml.includes('otel-collector:8889'));
  assert.ok(otelYml.includes('0.0.0.0:8889'));

  assert.equal(grafanaJson.uid, 'wespace-axum-prod');
  assert.equal(grafanaJson.panels.length, 4);
});
