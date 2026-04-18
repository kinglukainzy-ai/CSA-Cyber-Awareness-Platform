#!/bin/bash

# CSA Cyber Awareness Platform - Production Update Script
# Handles version-pinned updates, backups, migrations, and rollbacks.

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
NC='\033[0m'

log() { echo -e "${BLUE}[INFO]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
err() { echo -e "${RED}[ERROR]${NC} $1"; }
success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }

# Check for git and docker
if ! command -v git &> /dev/null || ! command -v docker &> /dev/null; then
    err "Git and Docker are required for updates."
    exit 1
fi

# 1. Version Discovery
log "Discovering versions..."
git fetch --tags --quiet
PREVIOUS_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "initial")
LATEST_TAG=$(git tag --sort=-version:refname | grep -E '^v[0-9]+\.[0-9]+\.[0-9]+$' | head -1)

if [[ -z "$LATEST_TAG" ]]; then
    warn "No valid semver tags found (vX.Y.Z). Falling back to main branch."
    TARGET_VERSION="main"
else
    TARGET_VERSION=${1:-$LATEST_TAG}
fi

echo -e "Current Version: ${BOLD}$PREVIOUS_TAG${NC}"
echo -e "Target Version:  ${BOLD}$TARGET_VERSION${NC}"

if [[ "$PREVIOUS_TAG" == "$TARGET_VERSION" && "$TARGET_VERSION" != "main" ]]; then
    read -p "Already on $TARGET_VERSION. Reinstall/Refresh? (y/n): " REFRESH
    [[ "$REFRESH" != "y" ]] && exit 0
fi

# 2. Check for Breaking Changes
if [[ "$TARGET_VERSION" != "main" ]]; then
    VERSION_BARE=${TARGET_VERSION#v}
    log "Checking CHANGELOG.md for $TARGET_VERSION notes..."
    CHANGES=$(grep -A 25 "\[${VERSION_BARE}\]" CHANGELOG.md || true)
    if [[ -n "$CHANGES" ]]; then
        echo -e "\n${YELLOW}${BOLD}--- Release Notes for $TARGET_VERSION ---${NC}"
        echo "$CHANGES"
        echo -e "${YELLOW}${BOLD}------------------------------------------${NC}\n"
        read -p "Proceed with update? (y/n): " PROCEED
        [[ "$PROCEED" != "y" ]] && exit 0
    fi
fi

# 3. Database Backup
log "Creating pre-update database backup..."
mkdir -p backups
BACKUP_FILE="backups/pre_update_${TARGET_VERSION}_$(date +%Y%m%d_%H%M%S).sql"
if docker compose ps postgres | grep -q "Up"; then
    docker compose exec -T postgres pg_dump -U csa csa_platform > "$BACKUP_FILE"
    success "Backup saved to $BACKUP_FILE"
else
    warn "Postgres container not running. Skipping backup."
fi

# 4. Apply Updates
log "Switching to $TARGET_VERSION..."
git checkout "$TARGET_VERSION" --quiet

log "Rebuilding and restarting services..."
docker compose up -d --build

log "Running database migrations..."
if docker compose ps backend | grep -q "Up"; then
    docker compose exec -T backend alembic upgrade head || {
        err "Migrations failed!"
        read -p "Rollback to $PREVIOUS_TAG? (y/n): " RB
        if [[ "$RB" == "y" ]]; then
            log "Rolling back..."
            git checkout "$PREVIOUS_TAG" --quiet
            docker compose up -d --build
            exit 1
        fi
        exit 1
    }
fi

# 5. Health Check
log "Verifying service health..."
sleep 5
SERVICES=("backend" "frontend" "postgres" "redis" "worker")
FAILED=()

for svc in "${SERVICES[@]}"; do
    STATUS=$(docker compose ps "$svc" --format json | grep -o '"Status":"[^"]*"' | cut -d'"' -f4 || echo "unknown")
    if [[ "$STATUS" != "running" ]]; then
        FAILED+=("$svc")
    fi
done

if [ ${#FAILED[@]} -gt 0 ]; then
    err "Health check failed for services: ${FAILED[*]}"
    read -p "Automatic rollback to $PREVIOUS_TAG? (y/n): " RB
    if [[ "$RB" == "y" ]]; then
        log "Rolling back code and containers..."
        git checkout "$PREVIOUS_TAG" --quiet
        docker compose up -d --build
        success "Rollback complete. System is back on $PREVIOUS_TAG."
    fi
    exit 1
fi

success "Update to $TARGET_VERSION complete and verified!"
docker compose ps
