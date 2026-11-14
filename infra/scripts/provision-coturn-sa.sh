#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# We Space — Provisionamento do Servidor Coturn em VM Pública (América do Sul)
# Região alvo: sa-east-1 (São Paulo) para bypass de CG-NAT e Firewall Estrito
# ==============================================================================

TURN_REALM="${TURN_REALM:-turn.wespace.gg}"
TURN_HMAC_SECRET="${TURN_HMAC_SECRET:-}"
EXTERNAL_IP="${EXTERNAL_IP:-}"
INTERNAL_IP="${INTERNAL_IP:-}"
TEMPLATE_PATH="${TEMPLATE_PATH:-infra/docker/turnserver.prod.conf}"
OUTPUT_CONF="${OUTPUT_CONF:-/etc/coturn/turnserver.conf}"

if [[ -z "$TURN_HMAC_SECRET" ]]; then
  echo "[ERRO] Defina a variável TURN_HMAC_SECRET antes de provisionar o Coturn." >&2
  exit 1
fi

if [[ "$TURN_HMAC_SECRET" == "dev_turn_hmac_secret_32bytes_min!" ]]; then
  echo "[ERRO] Proibido reutilizar o segredo de desenvolvimento em produção." >&2
  exit 1
fi

# Auto-detecção de IP público e IP privado da VM caso não informados
if [[ -z "$EXTERNAL_IP" ]]; then
  EXTERNAL_IP="$(curl -fsSL https://checkip.amazonaws.com | tr -d '[:space:]')"
fi

if [[ -z "$INTERNAL_IP" ]]; then
  INTERNAL_IP="$(hostname -I | awk '{print $1}')"
fi

echo "==> Configurando Coturn SA-East (External IP: ${EXTERNAL_IP} / Internal IP: ${INTERNAL_IP})"

# 1. Abertura das portas STUN/TURN e faixa de Relay UDP no Firewall (UFW)
if command -v ufw >/dev/null 2>&1; then
  echo "==> Liberando portas UDP/TCP do Coturn no UFW..."
  ufw allow 3478/udp comment "WeSpace Coturn STUN/TURN UDP"
  ufw allow 3478/tcp comment "WeSpace Coturn STUN/TURN TCP"
  ufw allow 5349/tcp comment "WeSpace Coturn TURNS TLS"
  ufw allow 5349/udp comment "WeSpace Coturn TURNS DTLS"
  ufw allow 49160:49200/udp comment "WeSpace Coturn Media Relay UDP Range"
fi

# 2. Geração do arquivo de configuração final a partir do template de produção
mkdir -p "$(dirname "$OUTPUT_CONF")"
sed \
  -e "s|__EXTERNAL_IP__|${EXTERNAL_IP}|g" \
  -e "s|__INTERNAL_IP__|${INTERNAL_IP}|g" \
  -e "s|__TURN_HMAC_SECRET__|${TURN_HMAC_SECRET}|g" \
  -e "s|__TURN_REALM__|${TURN_REALM}|g" \
  "$TEMPLATE_PATH" > "$OUTPUT_CONF"

chmod 640 "$OUTPUT_CONF"
echo "==> Configuração de produção gravada em ${OUTPUT_CONF}"

# 3. Inicialização via Docker ou systemd
if command -v docker >/dev/null 2>&1; then
  echo "==> Subindo container wespace-coturn-prod com rede host..."
  docker rm -f wespace-coturn-prod >/dev/null 2>&1 || true
  docker run -d \
    --name wespace-coturn-prod \
    --restart unless-stopped \
    --network host \
    -v "${OUTPUT_CONF}:/etc/coturn/turnserver.conf:ro" \
    coturn/coturn:4.6-alpine \
    -c /etc/coturn/turnserver.conf
elif command -v systemctl >/dev/null 2>&1; then
  systemctl enable --now coturn
  systemctl restart coturn
fi

echo "==> Servidor Coturn ativo e pronto para testes de voz WebRTC em CG-NAT!"
