#!/usr/bin/env bash

set -euo pipefail

: "${APP_DOMAIN:?Set APP_DOMAIN before running this script}"

APP_USER="${APP_USER:-ubuntu}"
APP_DIR="${APP_DIR:-/opt/global-digital-twin}"
APP_REPO="${APP_REPO:-https://github.com/AhmedHadi77/global-digital-twin.git}"
SERVICE_NAME="${SERVICE_NAME:-global-digital-twin}"

echo "[1/8] Updating Ubuntu packages"
sudo apt update
sudo apt upgrade -y

echo "[2/8] Installing base packages"
sudo apt install -y git curl build-essential ufw debian-keyring debian-archive-keyring apt-transport-https

echo "[3/8] Installing Node.js 22"
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo bash -
sudo apt install -y nodejs

echo "[4/8] Installing Caddy"
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list > /dev/null
sudo chmod o+r /usr/share/keyrings/caddy-stable-archive-keyring.gpg
sudo chmod o+r /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install -y caddy

echo "[5/8] Opening firewall ports"
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

echo "[6/8] Cloning or updating the application"
if [ ! -d "$APP_DIR/.git" ]; then
  sudo mkdir -p "$(dirname "$APP_DIR")"
  sudo git clone "$APP_REPO" "$APP_DIR"
fi

sudo chown -R "$APP_USER:$APP_USER" "$APP_DIR"
cd "$APP_DIR"
git pull origin main
cd "$APP_DIR/backend"
npm install

echo "[7/8] Installing systemd service"
sudo cp "$APP_DIR/deploy/oracle/global-digital-twin.service" "/etc/systemd/system/${SERVICE_NAME}.service"
sudo sed -i "s|__APP_USER__|$APP_USER|g" "/etc/systemd/system/${SERVICE_NAME}.service"
sudo sed -i "s|__APP_DIR__|$APP_DIR|g" "/etc/systemd/system/${SERVICE_NAME}.service"
sudo sed -i "s|__SERVICE_NAME__|$SERVICE_NAME|g" "/etc/systemd/system/${SERVICE_NAME}.service"

echo "[8/8] Installing Caddy config"
sudo cp "$APP_DIR/deploy/oracle/Caddyfile.example" /etc/caddy/Caddyfile
sudo sed -i "s|__APP_DOMAIN__|$APP_DOMAIN|g" /etc/caddy/Caddyfile

if [ ! -f "$APP_DIR/backend/.env" ]; then
  cp "$APP_DIR/deploy/oracle/backend.env.oracle.example" "$APP_DIR/backend/.env"
  echo
  echo "Created $APP_DIR/backend/.env from template."
  echo "Edit that file now and add your real database password and frontend URL."
fi

sudo systemctl daemon-reload
sudo systemctl enable --now "${SERVICE_NAME}.service"
sudo systemctl enable --now caddy
sudo systemctl restart caddy

echo
echo "Setup complete."
echo
echo "Next steps:"
echo "1. Edit $APP_DIR/backend/.env"
echo "2. Run: sudo systemctl restart ${SERVICE_NAME}.service"
echo "3. Test: https://${APP_DOMAIN}/health"
