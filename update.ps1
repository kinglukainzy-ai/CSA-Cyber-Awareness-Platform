# CSA Cyber Awareness Platform - Windows Update Script
# Handles version-pinned updates, backups, migrations, and rollbacks via PowerShell.

$ErrorActionPreference = "Stop"

function Write-Log { param($msg) Write-Host "[INFO] $msg" -ForegroundColor Blue }
function Write-Warn { param($msg) Write-Host "[WARN] $msg" -ForegroundColor Yellow }
function Write-Err { param($msg) Write-Host "[ERROR] $msg" -ForegroundColor Red }
function Write-Success { param($msg) Write-Host "[SUCCESS] $msg" -ForegroundColor Green }

# Check for git and docker
if (-not (Get-Command git -ErrorAction SilentlyContinue) -or -not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Err "Git and Docker are required for updates."
    exit 1
}

# 1. Version Discovery
Write-Log "Discovering versions..."
git fetch --tags --quiet
try {
    $previousTag = git describe --tags --abbrev=0 2>$null
} catch {
    $previousTag = "initial"
}

$latestTag = git tag --sort=-version:refname | Where-Object { $_ -match '^v\d+\.\d+\.\d+$' } | Select-Object -First 1

$targetVersion = if ($args.Count -gt 0) { $args[0] } else { $latestTag }

if (-not $targetVersion) {
    Write-Warn "No valid semver tags found (vX.Y.Z). Falling back to main branch."
    $targetVersion = "main"
}

Write-Host "Current Version: " -NoNewline; Write-Host $previousTag -ForegroundColor Cyan
Write-Host "Target Version:  " -NoNewline; Write-Host $targetVersion -ForegroundColor Cyan

if ($previousTag -eq $targetVersion -and $targetVersion -ne "main") {
    $refresh = Read-Host "Already on $targetVersion. Reinstall/Refresh? (y/n)"
    if ($refresh -ne "y") { exit 0 }
}

# 2. Check for Breaking Changes
if ($targetVersion -ne "main") {
    $versionBare = $targetVersion -replace '^v', ''
    Write-Log "Checking CHANGELOG.md for $targetVersion notes..."
    
    $changelogPath = Join-Path $PSScriptRoot "CHANGELOG.md"
    if (Test-Path $changelogPath) {
        $found = $false
        $notes = @()
        $content = Get-Content $changelogPath
        foreach ($line in $content) {
            if ($line -match "## \[$versionBare\]") { $found = $true; continue }
            if ($found -and $line -match "## \[\d+\.\d+\.\d+\]") { break }
            if ($found) { $notes += $line }
        }
        
        if ($notes.Count -gt 0 -and $notes.Count -lt 50) {
            Write-Host "`n--- Release Notes for $targetVersion ---" -ForegroundColor Yellow
            $notes | Out-String | Write-Host -ForegroundColor Yellow
            Write-Host "------------------------------------------`n" -ForegroundColor Yellow
            $proceed = Read-Host "Proceed with update? (y/n)"
            if ($proceed -ne "y") { exit 0 }
        }
    }
}

# 3. Database Backup
Write-Log "Creating pre-update database backup..."
if (-not (Test-Path "backups")) { New-Item -ItemType Directory -Path "backups" }
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFile = "backups\pre_update_$($targetVersion)_$timestamp.sql"

$postgresStatus = docker compose ps postgres --format json | ConvertFrom-Json -ErrorAction SilentlyContinue
if ($postgresStatus -and $postgresStatus.Status -eq "running") {
    # We use Get-Content/Set-Content to handle the redirection properly in PS
    docker compose exec -T postgres pg_dump -U csa csa_platform | Out-File -FilePath $backupFile -Encoding utf8
    if (Test-Path $backupFile) {
        Write-Success "Backup saved to $backupFile"
    }
} else {
    Write-Warn "Postgres container not running. Skipping backup."
}

# 4. Apply Updates
Write-Log "Switching to $targetVersion..."
git checkout $targetVersion --quiet

Write-Log "Rebuilding and restarting services..."
docker compose up -d --build

Write-Log "Running database migrations..."
$backendStatus = docker compose ps backend --format json | ConvertFrom-Json -ErrorAction SilentlyContinue
if ($backendStatus -and $backendStatus.Status -eq "running") {
    try {
        docker compose exec -T backend alembic upgrade head
    } catch {
        Write-Err "Migrations failed!"
        $rb = Read-Host "Rollback to $previousTag? (y/n)"
        if ($rb -eq "y") {
            Write-Log "Rolling back..."
            git checkout $previousTag --quiet
            docker compose up -d --build
            exit 1
        }
        exit 1
    }
}

# 5. Health Check
Write-Log "Verifying service health..."
Start-Sleep -Seconds 5
$services = "backend", "frontend", "postgres", "redis", "worker"
$failed = @()

foreach ($svc in $services) {
    $statusJson = docker compose ps $svc --format json | ConvertFrom-Json -ErrorAction SilentlyContinue
    if (-not $statusJson -or $statusJson.Status -ne "running") {
        $failed += $svc
    }
}

if ($failed.Count -gt 0) {
    Write-Err "Health check failed for services: $($failed -join ', ')"
    $rb = Read-Host "Automatic rollback to $previousTag? (y/n)"
    if ($rb -eq "y") {
        Write-Log "Rolling back code and containers..."
        git checkout $previousTag --quiet
        docker compose up -d --build
        Write-Success "Rollback complete. System is back on $previousTag."
    }
    exit 1
}

Write-Success "Update to $targetVersion complete and verified!"
docker compose ps
