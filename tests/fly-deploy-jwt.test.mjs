import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

function normalizePem(raw) {
  const trimmed = raw.trim();
  const unquoted =
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
      ? trimmed.slice(1, -1)
      : trimmed;

  return unquoted
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\r\n/g, '\n')
    .trim();
}

function resolveJwtKeyPem(envMap, primaryKey, fallbackKey, fileFallback = '') {
  for (const key of [primaryKey, fallbackKey]) {
    if (typeof envMap[key] === 'string') {
      const normalized = normalizePem(envMap[key]);
      if (normalized.length > 0) {
        return normalized;
      }
    }
  }
  return normalizePem(fileFallback);
}

test('Fly.io & JWT PEM: config.rs suporta JWT_PRIVATE_KEY_PEM, JWT_PUBLIC_KEY_PEM e normalização PEM', () => {
  const configRs = fs.readFileSync(
    path.join(rootDir, 'crates/api-server/src/config.rs'),
    'utf8'
  );

  assert.ok(configRs.includes('pub fn normalize_pem(raw: &str) -> String'));
  assert.ok(configRs.includes('Self::non_empty_env("JWT_PRIVATE_KEY_PEM")'));
  assert.ok(configRs.includes('Self::non_empty_env("JWT_PUBLIC_KEY_PEM")'));
  assert.ok(configRs.includes('pub fn resolve_jwt_private_key_pem() -> String'));
  assert.ok(configRs.includes('pub fn resolve_jwt_public_key_pem() -> String'));
});

test('Fly.io & JWT PEM: Normalização de chave RSA PEM escapada via fly secrets', () => {
  const escapedSecret =
    '"-----BEGIN PUBLIC KEY-----\\nMOCK_RSA_PEM_KEY_LINE_1\\n-----END PUBLIC KEY-----"';

  const normalized = normalizePem(escapedSecret);
  assert.ok(normalized.startsWith('-----BEGIN PUBLIC KEY-----\n'));
  assert.ok(normalized.endsWith('\n-----END PUBLIC KEY-----'));
  assert.ok(!normalized.includes('\\n'), 'Não deve conter \\n literal após normalização');
});

test('Fly.io & JWT PEM: Precedência de resolução prioriza JWT_PRIVATE_KEY_PEM e ignora valores vazios', () => {
  // 1. Prioriza JWT_PRIVATE_KEY_PEM sobre JWT_PRIVATE_KEY
  const resolvedProd = resolveJwtKeyPem(
    {
      JWT_PRIVATE_KEY_PEM: '-----BEGIN PUBLIC KEY-----\\nPROD_PEM_TEST\\n-----END PUBLIC KEY-----',
      JWT_PRIVATE_KEY: '-----BEGIN PUBLIC KEY-----\\nDEV_PEM_TEST\\n-----END PUBLIC KEY-----',
    },
    'JWT_PRIVATE_KEY_PEM',
    'JWT_PRIVATE_KEY'
  );
  assert.equal(resolvedProd, '-----BEGIN PUBLIC KEY-----\nPROD_PEM_TEST\n-----END PUBLIC KEY-----');

  // 2. Se JWT_PRIVATE_KEY_PEM estiver vazio (""), usa fallback JWT_PRIVATE_KEY ou arquivo
  const resolvedFallback = resolveJwtKeyPem(
    {
      JWT_PRIVATE_KEY_PEM: '""',
      JWT_PRIVATE_KEY: '',
    },
    'JWT_PRIVATE_KEY_PEM',
    'JWT_PRIVATE_KEY',
    '-----BEGIN PUBLIC KEY-----\nFILE_KEY\n-----END PUBLIC KEY-----'
  );
  assert.equal(resolvedFallback, '-----BEGIN PUBLIC KEY-----\nFILE_KEY\n-----END PUBLIC KEY-----');
});

test('Fly.io & JWT PEM: .env.example, fly.toml, workflow e script de deploy estão sincronizados', () => {
  const envExample = fs.readFileSync(path.join(rootDir, '.env.example'), 'utf8');
  const flyToml = fs.readFileSync(path.join(rootDir, 'fly.toml'), 'utf8');
  const workflowPath = fs.existsSync(
    path.join(rootDir, '.github/workflows/deploy-fly.yml')
  )
    ? path.join(rootDir, '.github/workflows/deploy-fly.yml')
    : path.join(rootDir, 'infra/workflows/deploy-fly.yml');
  const deployWorkflow = fs.readFileSync(workflowPath, 'utf8');
  const deployScript = fs.readFileSync(
    path.join(rootDir, 'infra/scripts/deploy-fly.ps1'),
    'utf8'
  );

  assert.ok(envExample.includes('JWT_PRIVATE_KEY_PEM='));
  assert.ok(envExample.includes('JWT_PUBLIC_KEY_PEM='));
  assert.ok(flyToml.includes('app = "wespace-api-prod"'));
  assert.ok(flyToml.includes('primary_region = "gru"'));
  assert.ok(flyToml.includes('JWT_PRIVATE_KEY_PEM'));
  assert.ok(deployWorkflow.includes('flyctl secrets set'));
  assert.ok(deployWorkflow.includes('JWT_PRIVATE_KEY_PEM'));
  assert.ok(deployWorkflow.includes('flyctl deploy --remote-only'));
  assert.ok(deployScript.includes('fly launch'));
  assert.ok(deployScript.includes('fly secrets set JWT_PRIVATE_KEY_PEM='));
  assert.ok(deployScript.includes('fly deploy --remote-only'));
});
