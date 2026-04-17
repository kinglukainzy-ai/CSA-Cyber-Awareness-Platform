# CSA Cyber Awareness Platform - Windows Setup script
# This script handles interactive configuration, TLS provisioning (Certbot),
# and full stack deployment via PowerShell.

$ErrorActionPreference = "Stop"

function Write-Log { param($msg) Write-Host "[INFO] $msg" -ForegroundColor Blue }
function Write-Warn { param($msg) Write-Host "[WARN] $msg" -ForegroundColor Yellow }
function Write-Err { param($msg) Write-Host "[ERROR] $msg" -ForegroundColor Red; exit 1 }
function Write-Success { param($msg) Write-Host "[SUCCESS] $msg" -ForegroundColor Green }

# Check for Administrator privileges
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Err "This script must be run as Administrator."
}

# --- SECTION 1: Dependency Check ---
Write-Log "[1/12] Checking dependencies..."

$deps = @("docker", "python", "pip")
foreach ($dep in $deps) {
    if (-not (Get-Command $dep -ErrorAction SilentlyContinue)) {
        Write-Warn "$dep not found. Please ensure it is installed and in your PATH."
    }
}

# Check for Docker Compose V2
if (-not (docker compose version 2>$null)) {
    Write-Err "Docker Compose V2 not found. Please install Docker Desktop."
}

# --- SECTION 2: Interactive Prompts ---
Clear-Host
Write-Host "==================================================" -ForegroundColor Blue -Object
Write-Host "   CSA Cyber Awareness Platform Setup (Windows)   " -ForegroundColor Blue -Object
Write-Host "==================================================" -ForegroundColor Blue -Object
Write-Host ""

$config = @{}

while ($true) {
    # Group A: Server & Domain
    Write-Host "--- Group A: Server & Domain ---" -Style Bold
    $hasCustomDomain = $null
    while ($hasCustomDomain -notmatch "^(yes|no)$") {
        $hasCustomDomain = Read-Host "Do you have a custom domain? (yes/no)"
    }

    if ($hasCustomDomain -eq "no") {
        while ($true) {
            $subdomain = Read-Host "DuckDNS subdomain prefix (e.g. csaplatform)"
            if ($subdomain -match "^[a-zA-Z0-9-]+$") { break }
            Write-Warn "Invalid subdomain format."
        }
        $duckdnsToken = Read-Host -AsSecureString "DuckDNS token"
        $config.DOMAIN = "$subdomain.duckdns.org"
        $config.SUBDOMAIN = $subdomain
        $config.DUCKDNS_TOKEN = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($duckdnsToken))
        $config.USE_DUCKDNS = $true
        $config.USE_HTTPS = $true
        Write-Log "DuckDNS path selected. HTTPS is mandatory."
    } else {
        while ($true) {
            $domain = Read-Host "Full domain (e.g. platform.csa.gov.gh)"
            if ($domain -match "^[a-zA-Z0-9.-]+\.[a-z]{2,}$") { break }
            Write-Warn "Invalid domain format."
        }
        $config.DOMAIN = $domain
        $config.USE_DUCKDNS = $false
        $useHttpsInput = Read-Host "Use HTTPS? (yes/no) [yes]"
        if (-not $useHttpsInput) { $useHttpsInput = "yes" }
        $config.USE_HTTPS = ($useHttpsInput -eq "yes")
    }

    # Group B: Admin Account
    Write-Host "`n--- Group B: Admin Account ---" -Style Bold
    while ($true) {
        $adminEmail = Read-Host "Admin email"
        if ($adminEmail -match "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$") { break }
        Write-Warn "Invalid email format."
    }
    $config.ADMIN_EMAIL = $adminEmail
    while ($true) {
        $adminPass = Read-Host -AsSecureString "Admin password (min 12 chars)"
        $adminPassStr = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($adminPass))
        if ($adminPassStr.Length -lt 12) { Write-Warn "Too short."; continue }
        $adminPassConf = Read-Host -AsSecureString "Confirm admin password"
        $adminPassConfStr = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($adminPassConf))
        if ($adminPassStr -eq $adminPassConfStr) { 
            $config.ADMIN_PASS = $adminPassStr
            break 
        }
        Write-Warn "Passwords do not match."
    }

    # Group C: SMTP
    Write-Host "`n--- Group C: SMTP ---" -Style Bold
    Write-Warn "SMTP is needed for phishing emails. Without it the platform works but cannot send phishing emails."
    $config.SMTP_HOST = Read-Host "SMTP host"
    $config.SMTP_PORT = Read-Host "SMTP port [587]"
    if (-not $config.SMTP_PORT) { $config.SMTP_PORT = 587 }
    $config.SMTP_USER = Read-Host "SMTP username"
    $smtpPass = Read-Host -AsSecureString "SMTP password"
    $config.SMTP_PASS = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($smtpPass))
    $config.SMTP_FROM_NAME = Read-Host "From name [CSA Cyber Platform]"
    if (-not $config.SMTP_FROM_NAME) { $config.SMTP_FROM_NAME = "CSA Cyber Platform" }

    # Group D: Database
    Write-Host "`n--- Group D: Database ---" -Style Bold
    $autoDbPass = Read-Host "Auto-generate strong DB password? (yes/no) [yes]"
    if (-not $autoDbPass) { $autoDbPass = "yes" }
    if ($autoDbPass -eq "yes") {
        $bytes = New-Object byte[] 24
        [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
        $config.DB_PASSWORD = [System.BitConverter]::ToString($bytes).Replace("-","").ToLower()
        Write-Log "Generated DB password: $($config.DB_PASSWORD)"
    } else {
        while ($true) {
            $dbPass = Read-Host -AsSecureString "Enter DB password (min 12 chars)"
            $dbPassStr = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($dbPass))
            if ($dbPassStr.Length -ge 12) { $config.DB_PASSWORD = $dbPassStr; break }
            Write-Warn "Too short."
        }
    }

    # Group E: MinIO
    Write-Host "`n--- Group E: MinIO ---" -Style Bold
    $config.MINIO_USER = Read-Host "MinIO username [csaadmin]"
    if (-not $config.MINIO_USER) { $config.MINIO_USER = "csaadmin" }
    $autoMinioPass = Read-Host "Auto-generate strong MinIO password? (yes/no) [yes]"
    if (-not $autoMinioPass) { $autoMinioPass = "yes" }
    if ($autoMinioPass -eq "yes") {
        $bytes = New-Object byte[] 24
        [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
        $config.MINIO_PASSWORD = [System.BitConverter]::ToString($bytes).Replace("-","").ToLower()
        Write-Log "Generated MinIO password: $($config.MINIO_PASSWORD)"
    } else {
        while ($true) {
            $minioPass = Read-Host -AsSecureString "Enter MinIO password (min 12 chars)"
            $minioPassStr = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($minioPass))
            if ($minioPassStr.Length -ge 12) { $config.MINIO_PASSWORD = $minioPassStr; break }
            Write-Warn "Too short."
        }
    }

    # Group F: Secrets
    $jwtBytes = New-Object byte[] 32
    $serialBytes = New-Object byte[] 32
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($jwtBytes)
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($serialBytes)
    $config.JWT_SECRET = [System.BitConverter]::ToString($jwtBytes).Replace("-","").ToLower()
    $config.SERIAL_SECRET = [System.BitConverter]::ToString($serialBytes).Replace("-","").ToLower()
    Write-Log "Generated JWT and Serial secrets automatically."

    # --- SECTION 3: Summary and Confirmation ---
    Write-Host "`n=== Configuration Summary ===" -ForegroundColor Blue
    function mask($val) { if ($val) { return $val.SubString(0,2) + "**********" } return "None" }
    printf "%-25s : %s`n" "Domain" $config.DOMAIN
    printf "%-25s : %s`n" "HTTPS" $config.USE_HTTPS
    printf "%-25s : %s`n" "Admin Email" $config.ADMIN_EMAIL
    printf "%-25s : %s`n" "Admin Password" (mask $config.ADMIN_PASS)
    printf "%-25s : %s`n" "DB Password" (mask $config.DB_PASSWORD)
    printf "%-25s : %s`n" "MinIO User/Pass" "$($config.MINIO_USER) / $(mask $config.MINIO_PASSWORD)"

    $confirm = Read-Host "Does everything look correct? (yes/no)"
    if ($confirm -eq "yes") { break }
    Write-Log "Restarting setup..."
}

# --- SECTION 4: DuckDNS Registration ---
if ($config.USE_DUCKDNS) {
    Write-Log "[4/12] Registering with DuckDNS..."
    $ip = Invoke-RestMethod -Uri "https://api.ipify.org"
    $url = "https://www.duckdns.org/update?domains=$($config.SUBDOMAIN)&token=$($config.DUCKDNS_TOKEN)&ip=$ip"
    $resp = Invoke-RestMethod -Uri $url
    if ($resp -ne "OK") { Write-Err "DuckDNS registration failed: $resp" }
    Write-Success "Domain $($config.DOMAIN) registered to $ip."
}

# --- SECTION 5: DNS Verification ---
Write-Log "[5/12] Verifying DNS resolution..."
$serverIp = Invoke-RestMethod -Uri "https://api.ipify.org"
$retryCount = 0
$maxRetries = 3

function Verify-DNS {
    foreach ($sub in "", "api.", "track.") {
        $fullDomain = "$sub$($config.DOMAIN)"
        try {
            $record = Resolve-DnsName -Name $fullDomain -Type A -ErrorAction Stop
            if ($record.IPAddress -ne $serverIp) { return $false }
        } catch { return $false }
    }
    return $true
}

while ($retryCount -lt $maxRetries) {
    if (Verify-DNS) {
        Write-Success "DNS verified."
        break
    } else {
        if ($config.USE_DUCKDNS) {
            Write-Warn "DNS not yet propagated. Retrying in 15s ($($retryCount + 1)/$maxRetries)..."
            Start-Sleep -Seconds 15
            $retryCount++
        } else {
            Write-Err "DNS check failed. Ensure A records for $($config.DOMAIN), api.$($config.DOMAIN), and track.$($config.DOMAIN) point to $serverIp."
        }
    }
}

if ($retryCount -eq $maxRetries) { Write-Err "DNS timeout." }

# --- SECTION 6: Certbot and TLS ---
if ($config.USE_HTTPS) {
    Write-Log "[6/12] Provisioning TLS via Certbot..."
    if (-not (Get-Command certbot -ErrorAction SilentlyContinue)) {
        Write-Err "Certbot not found. Please install Certbot for Windows."
    }

    if ($config.USE_DUCKDNS) {
        Write-Warn "DuckDNS DNS-01 on Windows usually requires manual plugin installation."
        # Attempting best-effort cert issuance via standalone if port 80 is available
        # or providing instructions. Given the complexity of plugins on Windows, 
        # we'll use standalone as primary and warn.
    }
    
    # Standalone command
    Write-Log "Issuing certificate for $($config.DOMAIN) and subdomains..."
    $certArgs = @(
        "certonly", "--standalone",
        "--non-interactive", "--agree-tos",
        "--email", $config.ADMIN_EMAIL,
        "-d", $config.DOMAIN,
        "-d", "api.$($config.DOMAIN)",
        "-d", "track.$($config.DOMAIN)"
    )
    Start-Process -FilePath "certbot" -ArgumentList $certArgs -Wait -NoNewWindow
    
    if ($LASTEXITCODE -ne 0) { Write-Err "Certbot failed." }
    Write-Success "Certificates issued."
}

# --- SECTION 7: Patch docker-compose.yml ---
Write-Log "[7/12] Patching docker-compose.yml..."
$composePath = Join-Path $PSScriptRoot "docker-compose.yml"
$content = Get-Content $composePath -Raw

# Remove tunnel
$content = $content -replace '(?ms)^\s+tunnel:.*?(?=\r?\n\r?\n|\z)', ''

# MinIO
$content = $content -replace 'MINIO_ROOT_USER: minioadmin', 'MINIO_ROOT_USER: ${MINIO_ROOT_USER}'
$content = $content -replace 'MINIO_ROOT_PASSWORD: minioadmin', 'MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD}'

if (-not $config.USE_HTTPS) {
    $content = $content -replace 'entrypoints=websecure', 'entrypoints=web'
    $content = $content -replace '(?m)^\s+- "traefik\.http\.routers\..*\.tls=true".*?\r?\n', ''
}

# Domains
$content = $content -replace [regex]::Escape("Host(`api.${DOMAIN}`)"), "Host(`api.$($config.DOMAIN)`)"
$content = $content -replace [regex]::Escape("Host(`track.${DOMAIN}`)"), "Host(`track.$($config.DOMAIN)`)"
$content = $content -replace [regex]::Escape("Host(`${DOMAIN}`)"), "Host(`$($config.DOMAIN)`)"

# Let's Encrypt Volume (Windows Path)
if ($config.USE_HTTPS) {
    $content = $content -replace '- "/etc/letsencrypt:/etc/letsencrypt:ro"', '- "C:/Certbot:/etc/letsencrypt:ro"'
}

Set-Content -Path $composePath -Value $content

# --- SECTION 8: Traefik dynamic_conf.yaml ---
Write-Log "[8/12] Writing Traefik config..."
$dynamicPath = Join-Path $PSScriptRoot "traefik/dynamic_conf.yaml"
if ($config.USE_HTTPS) {
    # On Windows Certbot live path is C:/Certbot/live
    $dynamicContent = @"
tls:
  certificates:
    - certFile: /etc/letsencrypt/live/$($config.DOMAIN)/fullchain.pem
      keyFile: /etc/letsencrypt/live/$($config.DOMAIN)/privkey.pem

http:
  middlewares:
    redirect-to-https:
      redirectScheme:
        scheme: https
        permanent: true
  routers:
    http-catchall:
      rule: "HostRegexp(\`{host:.+}\`)"
      entrypoints:
        - web
      middlewares:
        - redirect-to-https
      service: noop
  services:
    noop:
      loadBalancer:
        servers: []
"@
    Set-Content -Path $dynamicPath -Value $dynamicContent
} else {
    Set-Content -Path $dynamicPath -Value "# Manual non-TLS configuration"
}

# --- SECTION 9: Write .env ---
Write-Log "[9/12] Generating .env..."
$proto = if ($config.USE_HTTPS) { "https" } else { "http" }
$envContent = @"
DOMAIN=$($config.DOMAIN)
DB_PASSWORD=$($config.DB_PASSWORD)

FRONTEND_URL=$proto://$($config.DOMAIN)
API_URL=$proto://api.$($config.DOMAIN)
TRACKING_BASE_URL=$proto://track.$($config.DOMAIN)
NEXT_PUBLIC_API_URL=$proto://api.$($config.DOMAIN)/api/v1
NEXT_PUBLIC_SOCKET_URL=$proto://api.$($config.DOMAIN)

DATABASE_URL=postgresql+asyncpg://csa:$($config.DB_PASSWORD)@postgres:5432/csa_platform
REDIS_URL=redis://redis:6379/0
CELERY_BROKER_URL=redis://redis:6379/1
CELERY_RESULT_BACKEND=redis://redis:6379/2

JWT_SECRET=$($config.JWT_SECRET)
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=480
SERIAL_SECRET=$($config.SERIAL_SECRET)

SMTP_HOST=$($config.SMTP_HOST)
SMTP_PORT=$($config.SMTP_PORT)
SMTP_USER=$($config.SMTP_USER)
SMTP_PASSWORD=$($config.SMTP_PASS)
SMTP_FROM_NAME=$($config.SMTP_FROM_NAME)

MINIO_ENDPOINT=minio:9000
MINIO_ROOT_USER=$($config.MINIO_USER)
MINIO_ROOT_PASSWORD=$($config.MINIO_PASSWORD)
MINIO_ACCESS_KEY=$($config.MINIO_USER)
MINIO_SECRET_KEY=$($config.MINIO_PASSWORD)
MINIO_BUCKET=csa-reports

HIBP_API_URL=https://api.pwnedpasswords.com/range

SEED_ADMIN_EMAIL=$($config.ADMIN_EMAIL)
SEED_ADMIN_PASSWORD=$($config.ADMIN_PASS)
"@
Set-Content -Path (Join-Path $PSScriptRoot ".env") -Value $envContent

# --- SECTION 10: Task Scheduler & Helpers ---
Write-Log "[10/12] Setting up maintenance tasks..."
# Helper script: renew-cert.ps1
$renewScript = @"
Write-Host "Stopping Traefik..."
docker compose stop traefik
certbot renew --quiet
Write-Host "Restarting Traefik..."
docker compose start traefik
"@
Set-Content -Path (Join-Path $PSScriptRoot "renew-cert.ps1") -Value $renewScript

# Windows Task Scheduler for renewal
if ($config.USE_HTTPS) {
    Write-Log "Creating Scheduled Task for certificate renewal..."
    $action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-File $(Join-Path $PSScriptRoot 'renew-cert.ps1')"
    $trigger = New-ScheduledTaskTrigger -Daily -At 3am
    Register-ScheduledTask -TaskName "CSA-Cert-Renewal" -Action $action -Trigger $trigger -User "System" -RunLevel Highest -Force
}

# --- SECTION 11: Build and Deploy ---
Write-Log "[11/12] Deploying stack..."
docker compose up -d --build

Write-Log "Initializing database..."
Start-Sleep -Seconds 10
docker compose exec -T backend alembic upgrade head
docker compose exec -T backend python app/db/seeds.py

# --- SECTION 12: Final Output ---
Clear-Host
Write-Host "==================================================" -ForegroundColor Green
Write-Host "       Setup Complete! Platform is Live           " -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Frontend URL:  $proto://$($config.DOMAIN)"
Write-Host "API Health:    $proto://api.$($config.DOMAIN)/api/v1/health"
Write-Host "Admin Email:   $($config.ADMIN_EMAIL)"
Write-Host ""
Write-Warn "CRITICAL: Save your .env file securely."
