#!/usr/bin/env bash

set -euo pipefail

APP_DIR="${APP_DIR:-/opt/global-digital-twin}"
SERVICE_NAME="${SERVICE_NAME:-global-digital-twin}"

cd "$APP_DIR"
git pull origin main
cd "$APP_DIR/backend"
npm install
sudo systemctl restart "${SERVICE_NAME}.service"
sudo systemctl status "${SERVICE_NAME}.service" --no-pager
