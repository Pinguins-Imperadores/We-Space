import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const clientSource = fs.readFileSync(
  path.join(rootDir, 'packages/api-client/src/client.ts'),
  'utf8'
);
const wsSource = fs.readFileSync(
  path.join(rootDir, 'packages/api-client/src/ws.ts'),
  'utf8'
);

const clientJs = ts.transpileModule(clientSource, {
  compilerOptions: { module: ts.ModuleKind.ES2022 },
}).outputText;
const wsJs = ts.transpileModule(wsSource, {
  compilerOptions: { module: ts.ModuleKind.ES2022 },
}).outputText;

const { resolveDefaultApiBaseUrl } = await import(
  `data:text/javascript;base64,${Buffer.from(clientJs).toString('base64')}`
);
const { resolveDefaultWsUrl } = await import(
  `data:text/javascript;base64,${Buffer.from(wsJs).toString('base64')}`
);

test('DNS & Domínio: resolveDefaultApiBaseUrl e resolveDefaultWsUrl apontam app.wespace.gg para api.wespace.gg', () => {
  // Em produção no domínio app.wespace.gg ou wespace.gg
  assert.equal(
    resolveDefaultApiBaseUrl('app.wespace.gg'),
    'https://api.wespace.gg/api/v1'
  );
  assert.equal(
    resolveDefaultApiBaseUrl('wespace.gg'),
    'https://api.wespace.gg/api/v1'
  );
  assert.equal(
    resolveDefaultWsUrl('app.wespace.gg'),
    'wss://api.wespace.gg/api/v1/lfg/ws'
  );

  // Em desenvolvimento local (localhost / 127.0.0.1)
  assert.equal(
    resolveDefaultApiBaseUrl('localhost'),
    'http://127.0.0.1:8080/api/v1'
  );
  assert.equal(
    resolveDefaultWsUrl('127.0.0.1'),
    'ws://127.0.0.1:8080/api/v1/lfg/ws'
  );

  // Override explícito por variável de ambiente
  assert.equal(
    resolveDefaultApiBaseUrl('localhost', 'https://api.wespace.gg/api/v1/'),
    'https://api.wespace.gg/api/v1'
  );
});

test('DNS & Domínio: dns-records.json define CNAME/A para api.wespace.gg, app.wespace.gg, turn.wespace.gg e cdn.wespace.gg', () => {
  const dnsSpec = JSON.parse(
    fs.readFileSync(path.join(rootDir, 'infra/cloudflare/dns-records.json'), 'utf8')
  );

  assert.equal(dnsSpec.zone, 'wespace.gg');

  const apiRec = dnsSpec.records.find((r) => r.name === 'api.wespace.gg');
  assert.ok(apiRec, 'Registro api.wespace.gg deve existir');
  assert.equal(apiRec.type, 'CNAME');
  assert.equal(apiRec.content, 'wespace-api-prod.fly.dev');

  const appRec = dnsSpec.records.find((r) => r.name === 'app.wespace.gg');
  assert.ok(appRec, 'Registro app.wespace.gg deve existir');
  assert.equal(appRec.type, 'CNAME');
  assert.equal(appRec.content, 'wespace-pwa.pages.dev');
  assert.equal(appRec.proxied, true);

  const turnRec = dnsSpec.records.find((r) => r.name === 'turn.wespace.gg');
  assert.ok(turnRec, 'Registro turn.wespace.gg deve existir');
  assert.equal(turnRec.type, 'A');
  assert.equal(
    turnRec.proxied,
    false,
    'Registro A do Coturn deve ser DNS-Only (proxied=false) para tráfego UDP 3478 e 49160-49200'
  );
});

test('DNS & Domínio: Alinhamento com CORS do Backend Axum e CSP do Desktop Tauri', () => {
  const mainRs = fs.readFileSync(
    path.join(rootDir, 'crates/api-server/src/main.rs'),
    'utf8'
  );
  const tauriConf = fs.readFileSync(
    path.join(rootDir, 'apps/desktop/src-tauri/tauri.conf.json'),
    'utf8'
  );
  const cfScript = fs.readFileSync(
    path.join(rootDir, 'infra/scripts/configure-cloudflare-dns.ps1'),
    'utf8'
  );

  assert.ok(mainRs.includes('https://app.wespace.gg'));
  assert.ok(mainRs.includes('https://wespace.gg'));
  assert.ok(tauriConf.includes('https://api.wespace.gg'));
  assert.ok(tauriConf.includes('wss://api.wespace.gg'));
  assert.ok(cfScript.includes('api.cloudflare.com/client/v4/zones'));
});
