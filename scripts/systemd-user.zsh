#!/usr/bin/env zsh
set -euo pipefail

SCRIPT_DIR="${0:A:h}"
WUT_DIR="${SCRIPT_DIR:h}"
DENO_BIN="$(which deno)"
SERVICE_NAME="wut"
SERVICE_DIR="$HOME/.config/systemd/user"
SERVICE_FILE="$SERVICE_DIR/$SERVICE_NAME.service"

cmd="${1:-}"

case "$cmd" in
  up)
    mkdir -p "$SERVICE_DIR"

    cat > "$SERVICE_FILE" << EOF
[Unit]
Description=wut server
After=network.target

[Service]
Type=simple
WorkingDirectory=$WUT_DIR
ExecStart=$DENO_BIN run --allow-all --env-file --watch src/srv.ts
Restart=on-failure
Environment=HOME=%h

[Install]
WantedBy=default.target
EOF

    sudo loginctl enable-linger $USER
    systemctl --user daemon-reload
    systemctl --user enable --now $SERVICE_NAME
    echo "wut service installed and started"
    echo "  status: systemctl --user status $SERVICE_NAME"
    echo "  logs:   journalctl --user -u $SERVICE_NAME -f"
    ;;

  down)
    systemctl --user disable --now $SERVICE_NAME || true
    rm -f "$SERVICE_FILE"
    systemctl --user daemon-reload
    echo "wut service stopped and removed"
    ;;

  *)
    echo "usage: $0 <up|down>"
    exit 1
    ;;
esac
