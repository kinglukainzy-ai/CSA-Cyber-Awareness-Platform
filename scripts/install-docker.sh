#!/bin/bash

# CSA Platform - Docker Installation Helper
# Supports: Ubuntu, Debian, Fedora, CentOS, RHEL

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== CSA Platform: Docker Installation Helper ===${NC}\n"

# 1. Detect OS
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
else
    echo -e "${RED}Error: Unable to detect Operating System.${NC}"
    exit 1
fi

echo -e "Detected OS: ${YELLOW}$PRETTY_NAME${NC}"

# Check for sudo
if ! command -v sudo &> /dev/null; then
    echo -e "${RED}Error: sudo is required for installation.${NC}"
    exit 1
fi

case "$OS" in
    ubuntu|debian|kali|linuxmint)
        echo -e "${YELLOW}Updating package lists...${NC}"
        sudo apt-get update
        sudo apt-get install -y ca-certificates curl gnupg

        echo -e "${YELLOW}Adding Docker's official GPG key...${NC}"
        sudo install -m 0755 -d /etc/apt/keyrings
        curl -fsSL https://download.docker.com/linux/$OS/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
        sudo chmod a+r /etc/apt/keyrings/docker.gpg

        echo -e "${YELLOW}Setting up the repository...${NC}"
        echo \
          "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/$OS \
          "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" | \
          sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
        
        sudo apt-get update
        echo -e "${YELLOW}Installing Docker Engine...${NC}"
        sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
        ;;

    fedora|rhel|centos|amzn)
        echo -e "${YELLOW}Removing old versions...${NC}"
        sudo dnf remove -y docker \
                          docker-client \
                          docker-client-latest \
                          docker-common \
                          docker-latest \
                          docker-latest-logrotate \
                          docker-logrotate \
                          docker-selinux \
                          docker-engine-security \
                          docker-engine || true

        echo -e "${YELLOW}Setting up the repository...${NC}"
        sudo dnf -y install dnf-plugins-core
        if [ "$OS" == "fedora" ]; then
            sudo dnf config-manager --add-repo https://download.docker.com/linux/fedora/docker-ce.repo
        else
            sudo dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
        fi

        echo -e "${YELLOW}Installing Docker Engine...${NC}"
        sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
        
        echo -e "${YELLOW}Starting Docker service...${NC}"
        sudo systemctl start docker
        sudo systemctl enable docker
        ;;

    *)
        echo -e "${RED}Sorry, this script doesn't support $OS yet.${NC}"
        echo "Please follow the official guide: https://docs.docker.com/engine/install/"
        exit 1
        ;;
esac

# 2. Post-installation steps
echo -e "\n${GREEN}✓ Docker Engine installed successfully!${NC}"

# Add to docker group?
echo -en "\n${YELLOW}Would you like to add your user to the 'docker' group? (Allows running docker without sudo) [y/N]: ${NC}"
read -r response
if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    sudo usermod -aG docker $USER
    echo -e "${GREEN}✓ Added $USER to the docker group. ${YELLOW}Please log out and log back in for changes to take effect.${NC}"
fi

# Docker login?
echo -en "\n${YELLOW}Would you like to log in to Docker Hub now? [y/N]: ${NC}"
read -r response
if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    docker login
fi

echo -e "\n${GREEN}=== Installation Complete ===${NC}"
echo "You can now run the main installer: ./install.sh"
