import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

function generateTurnCredentials(host, port, secret, userId, ttlSeconds = 3600) {
  const expiration = Math.floor(Date.now() / 1000) + ttlSeconds;
  const username = `${expiration}:${userId}`;
  const credential = crypto
    .createHmac('sha1', secret)
    .update(username)
    .digest('base64');

  return {
    iceServers: [
      {
        urls: [`stun:${host}:${port}`],
      },
      {
        urls: [
          `turn:${host}:${port}?transport=udp`,
          `turn:${host}:${port}?transport=tcp`,
          `turns:${host}:5349?transport=tcp`,
        ],
        username,
        credential,
      },
    ],
    ttlSeconds,
  };
}

test('Coturn SA-East: turn.rs gera candidatos STUN, TURN (UDP/TCP) e TURNS (TLS 5349) para bypass de CG-NAT/Firewall', () => {
  const turnRs = fs.readFileSync(
    path.join(rootDir, 'crates/api-server/src/modules/lfg/turn.rs'),
    'utf8'
  );

  assert.ok(turnRs.includes('turn:{}:{}?transport=udp'));
  assert.ok(turnRs.includes('turn:{}:{}?transport=tcp'));
  assert.ok(turnRs.includes('turns:{}:5349?transport=tcp'));

  const cfg = generateTurnCredentials(
    'turn.sa.wespace.gg',
    3478,
    'prod_sa_east_hmac_secret_64bytes_random!',
    'duo_player_br_1'
  );

  assert.equal(cfg.iceServers.length, 2);
  assert.deepEqual(cfg.iceServers[1].urls, [
    'turn:turn.sa.wespace.gg:3478?transport=udp',
    'turn:turn.sa.wespace.gg:3478?transport=tcp',
    'turns:turn.sa.wespace.gg:5349?transport=tcp',
  ]);
  assert.ok(cfg.iceServers[1].username.endsWith(':duo_player_br_1'));
  assert.ok(cfg.iceServers[1].credential.length > 10);
});

test('Coturn SA-East: turnserver.prod.conf define external-ip para VM pública, TLS 5349, range UDP e proteção anti-SSRF', () => {
  const prodConf = fs.readFileSync(
    path.join(rootDir, 'infra/docker/turnserver.prod.conf'),
    'utf8'
  );

  assert.ok(prodConf.includes('listening-port=3478'));
  assert.ok(prodConf.includes('tls-listening-port=5349'));
  assert.ok(prodConf.includes('min-port=49160'));
  assert.ok(prodConf.includes('max-port=49200'));
  assert.ok(
    prodConf.includes('external-ip=__EXTERNAL_IP__/__INTERNAL_IP__'),
    'Deve mapear IP público e privado da VM para NAT 1:1 em nuvem'
  );
  assert.ok(prodConf.includes('no-tlsv1'));
  assert.ok(prodConf.includes('no-tlsv1_1'));
  assert.ok(prodConf.includes('denied-peer-ip=127.0.0.0-127.255.255.255'));
  assert.ok(prodConf.includes('denied-peer-ip=10.0.0.0-10.255.255.255'));
  assert.ok(prodConf.includes('denied-peer-ip=169.254.0.0-169.254.255.255'));
  assert.ok(
    !prodConf.includes('dev_turn_hmac_secret_32bytes_min!'),
    'Configuração de produção não deve conter o segredo de desenvolvimento'
  );
});

test('Coturn SA-East: script provision-coturn-sa.sh valida segredo, abre portas UDP no firewall e injeta EXTERNAL_IP', () => {
  const script = fs.readFileSync(
    path.join(rootDir, 'infra/scripts/provision-coturn-sa.sh'),
    'utf8'
  );

  assert.ok(script.includes('ufw allow 3478/udp'));
  assert.ok(script.includes('ufw allow 3478/tcp'));
  assert.ok(script.includes('ufw allow 5349/tcp'));
  assert.ok(script.includes('ufw allow 49160:49200/udp'));
  assert.ok(script.includes('dev_turn_hmac_secret_32bytes_min!'));
  assert.ok(script.includes('s|__EXTERNAL_IP__|${EXTERNAL_IP}|g'));
  assert.ok(script.includes('s|__INTERNAL_IP__|${INTERNAL_IP}|g'));
});
