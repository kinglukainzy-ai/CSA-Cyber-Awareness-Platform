#!/bin/bash
# CSA Platform - Update Script
# Use this on your server to pull the latest code and refresh the containers.

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}>>> Pulling latest changes from GitHub...${NC}"
git pull origin main

echo -e "${BLUE}>>> Rebuilding and restarting containers...${NC}"
docker-compose up -d --build

echo -e "${BLUE}>>> Running database migrations...${NC}"
docker-compose exec -T backend alembic upgrade head

echo -e "${GREEN}>>> Update successful! The platform is now running the latest version.${NC}"
