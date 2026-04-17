#!/bin/bash

# CSA Cyber Awareness Platform - Production setup script
# This script handles interactive configuration, TLS provisioning (Certbot),
# and full stack deployment.

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
err() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }
success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }

# --- SECTION 1: Dependency Check ---
log "[1/12] Checking dependencies..."

deps=("curl" "openssl" "dig" "pip3")
missing_deps=()

for dep in "${deps[@]}"; do
    if ! command -v "$dep" &> /dev/null; then
        missing_deps+=("$dep")
    fi
done

if [ ${#missing_deps[@]} -gt 0 ]; then
    log "Installing missing dependencies: ${missing_deps[*]}..."
    sudo apt-get update && sudo apt-get install -y curl openssl dnsutils python3-pip
fi

# Docker check
if ! command -v docker &> /dev/null; then
    err "Docker not found. Please install it first: https://docs.docker.com/get-docker/"
fi

if ! docker compose version &> /dev/null; then
    err "Docker Compose V2 not found. Please install it."
fi

# --- SECTION 2: Interactive Prompts ---
clear
echo -e "${BLUE}${BOLD}==================================================${NC}"
echo -e "${BLUE}${BOLD}   CSA Cyber Awareness Platform Setup Tool        ${NC}"
echo -e "${BLUE}${BOLD}==================================================${NC}\n"

while true; do
    # Group A: Server & Domain
    echo -e "${BOLD}--- Group A: Server & Domain ---${NC}"
    while true; do
        read -p "Do you have a custom domain? (yes/no): " HAS_CUSTOM_DOMAIN
        [[ "$HAS_CUSTOM_DOMAIN" =~ ^(yes|no)$ ]] && break
    done

    if [[ "$HAS_CUSTOM_DOMAIN" == "no" ]]; then
        while true; do
            read -p "DuckDNS subdomain prefix (e.g. csaplatform): " SUBDOMAIN
            if [[ "$SUBDOMAIN" =~ ^[a-zA-Z0-9-]+$ ]]; then break; fi
            warn "Invalid subdomain format. Use alphanumeric and hyphens only."
        done
        while true; do
            read -s -p "DuckDNS token: " DUCKDNS_TOKEN; echo ""
            if [[ -n "$DUCKDNS_TOKEN" ]]; then break; fi
        done
        DOMAIN="$SUBDOMAIN.duckdns.org"
        USE_DUCKDNS=true
        USE_HTTPS=true
        log "DuckDNS path selected. HTTPS is mandatory."
    else
        while true; do
            read -p "Full domain (e.g. platform.csa.gov.gh): " DOMAIN
            if [[ "$DOMAIN" =~ ^[a-zA-Z0-9.-]+\.[a-z]{2,}$ ]]; then break; fi
            warn "Invalid domain format."
        done
        USE_DUCKDNS=false
        while true; do
            read -p "Use HTTPS? (yes/no) [yes]: " USE_HTTPS_INPUT
            USE_HTTPS_INPUT=${USE_HTTPS_INPUT:-yes}
            if [[ "$USE_HTTPS_INPUT" =~ ^(yes|no)$ ]]; then
                [[ "$USE_HTTPS_INPUT" == "yes" ]] && USE_HTTPS=true || USE_HTTPS=false
                break
            fi
        done
    fi

    # Group B: Admin Account
    echo -e "\n${BOLD}--- Group B: Admin Account ---${NC}"
    while true; do
        read -p "Admin email: " ADMIN_EMAIL
        if [[ "$ADMIN_EMAIL" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then break; fi
        warn "Invalid email format."
    done
    while true; do
        read -s -p "Admin password (min 12 chars): " ADMIN_PASS; echo ""
        if [ ${#ADMIN_PASS} -lt 12 ]; then
            warn "Password too short (min 12 characters)."
            continue
        fi
        read -s -p "Confirm admin password: " ADMIN_PASS_CONF; echo ""
        if [ "$ADMIN_PASS" == "$ADMIN_PASS_CONF" ]; then break; fi
        warn "Passwords do not match."
    done

    # Group C: SMTP
    echo -e "\n${BOLD}--- Group C: SMTP ---${NC}"
    warn "SMTP is needed for phishing simulation emails. Without it the platform works but cannot send phishing emails."
    while true; do
        read -p "SMTP host: " SMTP_HOST
        [[ -z "$SMTP_HOST" ]] || break
    done
    read -p "SMTP port [587]: " SMTP_PORT; SMTP_PORT=${SMTP_PORT:-587}
    while true; do
        read -p "SMTP username: " SMTP_USER
        [[ -z "$SMTP_USER" ]] || break
    done
    while true; do
        read -s -p "SMTP password: " SMTP_PASS; echo ""
        [[ -z "$SMTP_PASS" ]] || break
    done
    read -p "From name [CSA Cyber Platform]: " SMTP_FROM_NAME; SMTP_FROM_NAME=${SMTP_FROM_NAME:-"CSA Cyber Platform"}

    # Group D: Database
    echo -e "\n${BOLD}--- Group D: Database ---${NC}"
    read -p "Auto-generate a strong DB password? (yes/no) [yes]: " AUTO_DB_PASS_INPUT
    AUTO_DB_PASS_INPUT=${AUTO_DB_PASS_INPUT:-yes}
    if [[ "$AUTO_DB_PASS_INPUT" == "yes" ]]; then
        DB_PASSWORD=$(openssl rand -hex 24)
        log "Generated DB password: $DB_PASSWORD (Please save this!)"
    else
        while true; do
            read -s -p "Enter DB password (min 12 chars): " DB_PASSWORD; echo ""
            [ ${#DB_PASSWORD} -ge 12 ] && break
            warn "Password too short."
        done
    fi

    # Group E: MinIO
    echo -e "\n${BOLD}--- Group E: MinIO ---${NC}"
    read -p "MinIO username [csaadmin]: " MINIO_USER; MINIO_USER=${MINIO_USER:-csaadmin}
    read -p "Auto-generate a strong MinIO password? (yes/no) [yes]: " AUTO_MINIO_PASS_INPUT
    AUTO_MINIO_PASS_INPUT=${AUTO_MINIO_PASS_INPUT:-yes}
    if [[ "$AUTO_MINIO_PASS_INPUT" == "yes" ]]; then
        MINIO_PASSWORD=$(openssl rand -hex 24)
        log "Generated MinIO password: $MINIO_PASSWORD"
    else
        while true; do
            read -s -p "Enter MinIO password (min 16 chars recommended): " MINIO_PASSWORD; echo ""
            [ ${#MINIO_PASSWORD} -ge 12 ] && break
            warn "MinIO password too short."
        done
        [ ${#MINIO_PASSWORD} -lt 16 ] && warn "MinIO password is under 16 characters."
    fi

    # Group F: Secrets
    JWT_SECRET=$(openssl rand -hex 32)
    SERIAL_SECRET=$(openssl rand -hex 32)
    log "Generated JWT and Serial secrets automatically."

    # --- SECTION 3: Summary and Confirmation ---
    echo -e "\n${BLUE}${BOLD}=== Configuration Summary ===${NC}"
    mask() { echo "${1:0:2}**********"; }
    printf "%-25s : %s\n" "Domain" "$DOMAIN"
    printf "%-25s : %s\n" "HTTPS" "$USE_HTTPS"
    printf "%-25s : %s\n" "Admin Email" "$ADMIN_EMAIL"
    printf "%-25s : %s\n" "Admin Password" "$(mask "$ADMIN_PASS")"
    printf "%-25s : %s\n" "SMTP Host" "$SMTP_HOST"
    printf "%-25s : %s\n" "DB Password" "$(mask "$DB_PASSWORD")"
    printf "%-25s : %s\n" "MinIO User/Pass" "$MINIO_USER / $(mask "$MINIO_PASSWORD")"

    read -p "Does everything look correct? (yes/no): " CONFIRM_ALL
    if [[ "$CONFIRM_ALL" == "yes" ]]; then break; fi
    log "Restarting setup..."
done

# --- SECTION 4: DuckDNS Registration ---
if [ "$USE_DUCKDNS" = true ]; then
    log "[4/12] Registering with DuckDNS..."
    SERVER_IP=$(curl -s https://api.ipify.org)
    RESPONSE=$(curl -s "https://www.duckdns.org/update?domains=$SUBDOMAIN&token=$DUCKDNS_TOKEN&ip=$SERVER_IP")
    if [ "$RESPONSE" != "OK" ]; then
        err "DuckDNS registration failed for $SUBDOMAIN. Response: $RESPONSE"
    fi
    success "Domain $DOMAIN registered to $SERVER_IP."
fi

# --- SECTION 5: DNS Verification ---
log "[5/12] Verifying DNS resolution..."
SERVER_IP=$(curl -s https://api.ipify.org)
RETRY_COUNT=0
MAX_RETRIES=3

verify_dns() {
    for sub in "" "api." "track."; do
        RESOLVED=$(dig +short "${sub}${DOMAIN}" | tail -1)
        if [ "$RESOLVED" != "$SERVER_IP" ]; then
            return 1
        fi
    done
    return 0
}

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if verify_dns; then
        success "DNS verified for $DOMAIN and subdomains."
        break
    else
        if [ "$USE_DUCKDNS" = true ]; then
            warn "DNS not yet propagated. Retrying in 15s ($((RETRY_COUNT+1))/$MAX_RETRIES)..."
            sleep 15
            RETRY_COUNT=$((RETRY_COUNT+1))
        else
            err "DNS verification failed. Make sure you have created A records for $DOMAIN, api.$DOMAIN, and track.$DOMAIN pointing to $SERVER_IP."
        fi
    fi
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    err "DNS propagation timed out. Please check your settings and try again."
fi

# --- SECTION 6: Certbot and TLS ---
if [ "$USE_HTTPS" = true ]; then
    log "[6/12] Provisioning TLS certificates via Certbot..."
    if ! command -v certbot &> /dev/null; then
        sudo apt-get install -y certbot
    fi

    if [ "$USE_DUCKDNS" = true ]; then
        log "Using DuckDNS DNS-01 challenge..."
        sudo pip3 install certbot-dns-duckdns --break-system-packages || sudo pip3 install certbot-dns-duckdns
        sudo mkdir -p /etc/letsencrypt/duckdns
        echo "dns_duckdns_token=$DUCKDNS_TOKEN" | sudo tee /etc/letsencrypt/duckdns/credentials.ini > /dev/null
        sudo chmod 600 /etc/letsencrypt/duckdns/credentials.ini
        
        sudo certbot certonly \
            --authenticator dns-duckdns \
            --dns-duckdns-credentials /etc/letsencrypt/duckdns/credentials.ini \
            --dns-duckdns-propagation-seconds 60 \
            --non-interactive --agree-tos \
            --email "$ADMIN_EMAIL" \
            -d "$DOMAIN" \
            -d "api.$DOMAIN" \
            -d "track.$DOMAIN"
    else
        log "Using HTTP-01 challenge..."
        if lsof -Pi :80 -sTCP:LISTEN -t >/dev/null ; then
            err "Port 80 is occupied. Please stop any process using it (e.g. Apache/Nginx/Docker) and rerun."
        fi
        sudo certbot certonly --standalone \
            --non-interactive --agree-tos \
            --email "$ADMIN_EMAIL" \
            -d "$DOMAIN" \
            -d "api.$DOMAIN" \
            -d "track.$DOMAIN"
    fi

    if [ $? -ne 0 ]; then
        err "Certbot failed to issue certificates."
    fi
    success "Certificates issued successfully."
fi

# --- SECTION 7: Patch docker-compose.yml ---
log "[7/12] Patching infrastructure config..."
# Safe tunnel removal: only if it exists
if grep -q "tunnel:" docker-compose.yml; then
    sed -i '/tunnel:/,/networks:/d' docker-compose.yml
fi

# Parametrize MinIO
sed -i 's/MINIO_ROOT_USER: minioadmin/MINIO_ROOT_USER: ${MINIO_ROOT_USER}/g' docker-compose.yml
sed -i 's/MINIO_ROOT_PASSWORD: minioadmin/MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD}/g' docker-compose.yml

if [ "$USE_HTTPS" = "false" ]; then
    log "Adjusting for HTTP entrypoints..."
    sed -i 's/entrypoints=websecure/entrypoints=web/g' docker-compose.yml
    sed -i '/tls=true/d' docker-compose.yml
fi

# Final Host rule update - replace the variable with the actual domain string
# We use a different delimiter for sed to avoid backtick escaping issues
sed -i "s|Host(\`api.\${DOMAIN}\`)|Host(\`api.$DOMAIN\`)|g" docker-compose.yml
sed -i "s|Host(\`track.\${DOMAIN}\`)|Host(\`track.$DOMAIN\`)|g" docker-compose.yml
sed -i "s|Host(\`\${DOMAIN}\`)|Host(\`$DOMAIN\`)|g" docker-compose.yml

# --- SECTION 8: Write traefik/dynamic_conf.yaml ---
log "[8/12] Generating Traefik dynamic configuration..."
if [ "$USE_HTTPS" = true ]; then
cat <<EOF > traefik/dynamic_conf.yaml
tls:
  certificates:
    - certFile: /etc/letsencrypt/live/$DOMAIN/fullchain.pem
      keyFile: /etc/letsencrypt/live/$DOMAIN/privkey.pem

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
EOF
else
    echo "# Manual non-TLS configuration" > traefik/dynamic_conf.yaml
fi

# --- SECTION 9: Write .env ---
log "[9/12] Generating environment file..."
PROTO=$([[ "$USE_HTTPS" == "true" ]] && echo "https" || echo "http")

cat <<EOF > .env
DOMAIN=$DOMAIN
DB_PASSWORD=$DB_PASSWORD

FRONTEND_URL=$PROTO://$DOMAIN
API_URL=$PROTO://api.$DOMAIN
TRACKING_BASE_URL=$PROTO://track.$DOMAIN
NEXT_PUBLIC_API_URL=$PROTO://api.$DOMAIN/api/v1
NEXT_PUBLIC_SOCKET_URL=$PROTO://api.$DOMAIN

DATABASE_URL=postgresql+asyncpg://csa:$DB_PASSWORD@postgres:5432/csa_platform
REDIS_URL=redis://redis:6379/0
CELERY_BROKER_URL=redis://redis:6379/1
CELERY_RESULT_BACKEND=redis://redis:6379/2

JWT_SECRET=$JWT_SECRET
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=480
SERIAL_SECRET=$SERIAL_SECRET

SMTP_HOST=$SMTP_HOST
SMTP_PORT=$SMTP_PORT
SMTP_USER=$SMTP_USER
SMTP_PASSWORD=$SMTP_PASS
SMTP_FROM_NAME=$SMTP_FROM_NAME

MINIO_ENDPOINT=minio:9000
MINIO_ROOT_USER=$MINIO_USER
MINIO_ROOT_PASSWORD=$MINIO_PASSWORD
MINIO_ACCESS_KEY=$MINIO_USER
MINIO_SECRET_KEY=$MINIO_PASSWORD
MINIO_BUCKET=csa-reports

HIBP_API_URL=https://api.pwnedpasswords.com/range

# Admin seed
SEED_ADMIN_EMAIL=$ADMIN_EMAIL
SEED_ADMIN_PASSWORD=$ADMIN_PASS
EOF

# --- SECTION 10: Write Automation Scripts ---
log "[10/12] Setting up maintenance scripts..."
DOCKER_PATH=$(pwd)/docker-compose.yml

# renew-cert.sh
cat <<EOF > renew-cert.sh
#!/bin/bash
if [ "$USE_DUCKDNS" = "false" ]; then
    log "Stopping Traefik for standalone challenge..."
    docker compose -f $DOCKER_PATH stop traefik
fi
certbot renew --quiet
if [ "$USE_DUCKDNS" = "false" ]; then
    log "Restarting Traefik..."
    docker compose -f $DOCKER_PATH start traefik
fi
certbot certificates --domain $DOMAIN
EOF
chmod +x renew-cert.sh

# check-cert.sh
cat <<EOF > check-cert.sh
#!/bin/bash
echo "--- Certbot Status ---"
certbot certificates --domain $DOMAIN
echo -e "\n--- Live Expiry Check ---"
echo | openssl s_client -connect $DOMAIN:443 2>/dev/null | openssl x509 -noout -dates
EOF
chmod +x check-cert.sh

# Cron jobs
if [ "$USE_HTTPS" = true ]; then
    if [ "$USE_DUCKDNS" = true ]; then
        echo "0 3 * * * root $(pwd)/renew-cert.sh >> /var/log/csa-cert-renew.log 2>&1" | sudo tee /etc/cron.d/csa-cert-renew > /dev/null
        echo "*/30 * * * * root curl -s \"https://www.duckdns.org/update?domains=$SUBDOMAIN&token=$DUCKDNS_TOKEN&ip=\" >> /var/log/duckdns-refresh.log 2>&1" | sudo tee /etc/cron.d/csa-duckdns-refresh > /dev/null
    else
        echo "0 3 * * * root $(pwd)/renew-cert.sh >> /var/log/csa-cert-renew.log 2>&1" | sudo tee /etc/cron.d/csa-cert-renew > /dev/null
    fi

    # Logrotate
    cat <<EOF | sudo tee /etc/logrotate.d/csa-platform > /dev/null
/var/log/csa-cert-renew.log /var/log/duckdns-refresh.log {
    weekly
    rotate 4
    compress
    missingok
    notifempty
}
EOF
fi

# --- SECTION 11: Deploy core stack ---
log "[11/12] Building and launching containers..."
docker compose up -d --build

log "Waiting for services to initialize..."
until docker compose exec -T postgres pg_isready -U csa -d csa_platform >/dev/null 2>&1; do
    sleep 2
done

docker compose exec -T backend alembic upgrade head
docker compose exec -T backend python app/db/seeds.py

# --- SECTION 12: Final Output ---
clear
echo -e "${GREEN}${BOLD}==================================================${NC}"
echo -e "${GREEN}${BOLD}       Setup Complete! Platform is Live           ${NC}"
echo -e "${GREEN}${BOLD}==================================================${NC}\n"

echo -e "Frontend URL:  ${BOLD}$PROTO://$DOMAIN${NC}"
echo -e "API Health:    ${BOLD}$PROTO://api.$DOMAIN/api/v1/health${NC}"
echo -e "Admin Login:   ${BOLD}$ADMIN_EMAIL${NC}"
echo -e "Admin Pass:    (As entered during setup)\n"

if [ "$USE_HTTPS" = true ]; then
    echo -e "TLS Cert:      $(sudo certbot certificates --domain $DOMAIN 2>/dev/null | grep 'Expiry Date' | xargs)"
fi

echo -e "\n${YELLOW}Maintenance Helpers:${NC}"
echo -e "- Force Cert Renewal: ./renew-cert.sh"
echo -e "- Check Cert Status:  ./check-cert.sh"
echo -e "\n${BOLD}${RED}CRITICAL:${NC} Save your .env file in a secure location. It contains your encryption keys."
