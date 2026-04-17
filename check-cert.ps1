# CSA Platform - Certificate Status Check
$ErrorActionPreference = "Stop"

$envPath = Join-Path $PSScriptRoot ".env"
if (-not (Test-Path $envPath)) {
    Write-Host "No .env file found. Run install.ps1 first." -ForegroundColor Red
    exit 1
}

# Simple regex to extract DOMAIN from .env
$domain = (Get-Content $envPath | Select-String "DOMAIN=").ToString().Split("=")[1]

Write-Host "--- Certbot Status ---" -ForegroundColor Blue
certbot certificates --domain $domain

Write-Host "`n--- Live Expiry Check (OpenSSL) ---" -ForegroundColor Blue
echo | openssl s_client -connect "$domain:443" 2>$null | openssl x509 -noout -dates
