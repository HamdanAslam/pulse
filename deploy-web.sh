#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WEB_DIR="$ROOT_DIR/web"
TARGET_DIR="/srv/pulse-chat"

cd "$WEB_DIR"
npm run build

sudo install -d -m 0755 "$TARGET_DIR"
sudo cp -a dist/. "$TARGET_DIR/"
