#!/bin/bash
set -e

echo "Installing NoWenOS..."

# Create user
if ! id -u nowenos >/dev/null 2>&1; then
    useradd --system --no-create-home --shell /usr/sbin/nologin nowenos
fi

# Create directories
mkdir -p /var/lib/nowenos
mkdir -p /var/lib/nowenos/trash
mkdir -p /var/log/nowenos

# Copy binary
cp nowenos-api /usr/bin/nowenos-api
chmod 755 /usr/bin/nowenos-api

# Copy systemd service
cp deploy/systemd/nowenos-api.service /etc/systemd/system/
systemctl daemon-reload

# Set permissions
chown -R nowenos:nowenos /var/lib/nowenos
chown -R nowenos:nowenos /var/log/nowenos

echo "NoWenOS installed successfully!"
echo "Run: systemctl enable --now nowenos-api"
echo "Then open http://localhost:8080 in your browser"
