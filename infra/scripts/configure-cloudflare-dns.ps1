param(
    [string]$ZoneId = $env:CLOUDFLARE_ZONE_ID,
    [string]$ApiToken = $env:CLOUDFLARE_API_TOKEN,
    [string]$CoturnPublicIp = $env:COTURN_SA_PUBLIC_IP,
    [string]$RecordsFile = "infra/cloudflare/dns-records.json",
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $RecordsFile)) {
    throw "Arquivo de especificação DNS não encontrado: $RecordsFile"
}

$spec = Get-Content -Raw -Path $RecordsFile | ConvertFrom-Json
Write-Host "==> We Space — Configuração de DNS Cloudflare para a zona '$($spec.zone)'" -ForegroundColor Cyan

foreach ($rec in $spec.records) {
    $content = $rec.content
    if ($content -eq '${COTURN_SA_PUBLIC_IP}') {
        if ([string]::IsNullOrWhiteSpace($CoturnPublicIp)) {
            Write-Host "[SKIP] $($rec.name) ($($rec.type)): defina COTURN_SA_PUBLIC_IP para atualizar o registro A do Coturn." -ForegroundColor Yellow
            continue
        }
        $content = $CoturnPublicIp
    }

    if ($DryRun -or [string]::IsNullOrWhiteSpace($ZoneId) -or [string]::IsNullOrWhiteSpace($ApiToken)) {
        Write-Host "[DRY-RUN] $($rec.type) $($rec.name) -> $content (proxied=$($rec.proxied), ttl=$($rec.ttl))" -ForegroundColor Green
        continue
    }

    $headers = @{
        "Authorization" = "Bearer $ApiToken"
        "Content-Type"  = "application/json"
    }

    $baseUri = "https://api.cloudflare.com/client/v4/zones/$ZoneId/dns_records"
    $existing = Invoke-RestMethod -Method Get -Uri "$baseUri?type=$($rec.type)&name=$($rec.name)" -Headers $headers

    $body = @{
        type    = $rec.type
        name    = $rec.name
        content = $content
        proxied = [bool]$rec.proxied
        ttl     = [int]$rec.ttl
        comment = $rec.comment
    } | ConvertTo-Json

    if ($existing.result -and $existing.result.Count -gt 0) {
        $recordId = $existing.result[0].id
        Write-Host "==> Atualizando registro existente $($rec.type) $($rec.name) -> $content..." -ForegroundColor Green
        Invoke-RestMethod -Method Put -Uri "$baseUri/$recordId" -Headers $headers -Body $body | Out-Null
    } else {
        Write-Host "==> Criando novo registro $($rec.type) $($rec.name) -> $content..." -ForegroundColor Green
        Invoke-RestMethod -Method Post -Uri $baseUri -Headers $headers -Body $body | Out-Null
    }
}

Write-Host "==> Sincronização de DNS Cloudflare concluída com sucesso!" -ForegroundColor Cyan
