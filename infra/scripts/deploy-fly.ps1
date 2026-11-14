param(
    [string]$AppName = "wespace-api-prod",
    [string]$Region = "gru",
    [string]$PrivateKeyPath = "docs/keys/dev_private.pem",
    [string]$PublicKeyPath = "docs/keys/dev_public.pem",
    [switch]$InitApp
)

$ErrorActionPreference = "Stop"

Write-Host "==> We Space — Deploy de Produção Fly.io ($Region)" -ForegroundColor Cyan

if (-not (Get-Command fly -ErrorAction SilentlyContinue)) {
    throw "O CLI 'fly' (flyctl) não foi encontrado no PATH. Instale via: iwr https://fly.io/install.ps1 -useb | iex"
}

if ($InitApp) {
    Write-Host "==> Inicializando aplicação no Fly.io com fly.toml existente..." -ForegroundColor Yellow
    fly launch --copy-config --name $AppName --region $Region --no-deploy
}

$jwtPrivatePem = $env:JWT_PRIVATE_KEY_PEM
if ([string]::IsNullOrWhiteSpace($jwtPrivatePem) -and (Test-Path $PrivateKeyPath)) {
    $jwtPrivatePem = Get-Content -Raw -Path $PrivateKeyPath
}

if ([string]::IsNullOrWhiteSpace($jwtPrivatePem)) {
    throw "Defina a variável de ambiente JWT_PRIVATE_KEY_PEM ou forneça o caminho em -PrivateKeyPath antes do deploy."
}

$jwtPublicPem = $env:JWT_PUBLIC_KEY_PEM
if ([string]::IsNullOrWhiteSpace($jwtPublicPem) -and (Test-Path $PublicKeyPath)) {
    $jwtPublicPem = Get-Content -Raw -Path $PublicKeyPath
}

Write-Host "==> Vinculando segredo RSA (JWT_PRIVATE_KEY_PEM) no Fly.io (--stage)..." -ForegroundColor Green
if (-not [string]::IsNullOrWhiteSpace($jwtPublicPem)) {
    fly secrets set JWT_PRIVATE_KEY_PEM="$jwtPrivatePem" JWT_PUBLIC_KEY_PEM="$jwtPublicPem" --app $AppName --stage
} else {
    fly secrets set JWT_PRIVATE_KEY_PEM="$jwtPrivatePem" --app $AppName --stage
}

Write-Host "==> Executando fly deploy para $AppName (região $Region)..." -ForegroundColor Green
fly deploy --remote-only --config fly.toml --app $AppName
