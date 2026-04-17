#!/bin/bash

# CSA Cyber Awareness Platform - Setup Script
# This script configures environment variables, builds the container stack,
# and initializes the database with persistence.

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== CSA Platform Installation & Setup ===${NC}\n"

# 1. Check for Dependencies
echo -e "${YELLOW}[1/4] Checking dependencies...${NC}"
HAS_DOCKER=false
if [ -x "$(command -v docker)" ]; then
    HAS_DOCKER=true
    DOCKER_BIN="docker"
elif [ -x "$(command -v podman)" ]; then
    echo -e "${BLUE}ℹ Podman detected. Using it as a Docker alternative.${NC}"
    HAS_DOCKER=true
    DOCKER_BIN="podman"
    # Create an alias-like function for the script session
    docker() { podman "$@"; }
fi

if [ "$HAS_DOCKER" = false ]; then
  echo -e "${RED}Error: Docker (or Podman) is not installed.${NC}"
  echo -e "Please run the installation helper first:"
  echo -e "${BLUE}  chmod +x scripts/install-docker.sh && ./scripts/install-docker.sh${NC}"
  exit 1
fi

# Check for Docker Compose
if ! [ -x "$(command -v docker-compose)" ]; then
  if ! $DOCKER_BIN compose version >/dev/null 2>&1; then
    echo -e "${RED}Error: docker-compose is not installed.${NC}"
    exit 1
  fi
  DOCKER_COMPOSE="$DOCKER_BIN compose"
else
  DOCKER_COMPOSE="docker-compose"
fi
echo -e "${GREEN}✓ Container engine ($DOCKER_BIN) and Compose are available.${NC}\n"

# 2. Configure Environment
echo -e "${YELLOW}[2/4] Configuring environment variables...${NC}"
if [ ! -f .env ]; then
    echo "Creating .env from .env.example..."
    cp .env.example .env
    
    # Generate random secrets for security
    if [ -x "$(command -v openssl)" ]; then
        JWT_SECRET=$(openssl rand -hex 32)
        SERIAL_SECRET=$(openssl rand -hex 32)
        sed -i "s/JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" .env
        sed -i "s/SERIAL_SECRET=.*/SERIAL_SECRET=$SERIAL_SECRET/" .env
        echo -e "${GREEN}✓ Generated secure random secrets for JWT and Serial systems.${NC}"
    else
        echo -e "${YELLOW}! openssl not found. Please manually update JWT_SECRET and SERIAL_SECRET in .env${NC}"
    fi
    # Set default domain for local use
    sed -i "s/DOMAIN=.*/DOMAIN=localhost/" .env
else
    echo -e "${GREEN}✓ .env file already exists. Skipping creation.${NC}"
fi
echo ""

# 3. Launch Docker Containers
echo -e "${YELLOW}[3/4] Building and launching containers...${NC}"
$DOCKER_COMPOSE up -d --build
echo -e "${GREEN}✓ Stack is running in the background.${NC}\n"

# 4. Database Setup (Migrations & Seeding)
echo -e "${YELLOW}[4/4] Initializing database and services...${NC}"
echo "Waiting for PostgreSQL to be ready..."
until $DOCKER_COMPOSE exec -T postgres pg_isready -U csa -d csa_platform >/dev/null 2>&1; do
  sleep 2
done

echo "Running database migrations (Alembic)..."
$DOCKER_COMPOSE exec -T backend alembic upgrade head

echo "Seeding initial data (Admins, Organisations, Challenges)..."
$DOCKER_COMPOSE exec -T backend python app/db/seeds.py

echo -e "\n${GREEN}=== Setup Complete! ===${NC}"
echo -e "You can now access the platform at:"
echo -e "${BLUE}Frontend:   ${NC}http://localhost"
echo -e "${BLUE}API Health: ${NC}http://localhost/health"
echo -e "${BLUE}MinIO:      ${NC}http://localhost:9001 (Console)"
echo -e "\n${YELLOW}Note: Persistence is handled via Docker volumes: postgres_data, minio_data, and redis_data.${NC}"
