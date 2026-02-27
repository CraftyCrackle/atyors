#!/bin/bash
set -e

DOMAIN="atyors.com"
EMAIL="admin@atyors.com"
COMPOSE="docker compose -f docker-compose.yml -f docker-compose.ec2.yml"

echo "=== Step 1: Start with HTTP-only Nginx config ==="
cp nginx/ec2-init.conf nginx/ec2-active.conf
# Temporarily override to use init config
sed -i 's|./nginx/ec2.conf|./nginx/ec2-active.conf|' docker-compose.ec2.yml

echo "=== Step 2: Build and start services ==="
$COMPOSE build
$COMPOSE up -d nginx api web mongodb redis

echo "=== Step 3: Wait for services to be healthy ==="
sleep 30

echo "=== Step 4: Request SSL certificate ==="
docker run --rm \
  -v "$(docker volume ls -q | grep certbot-webroot | head -1):/var/www/certbot" \
  -v "$(docker volume ls -q | grep certbot-certs | head -1):/etc/letsencrypt" \
  certbot/certbot certonly \
  --webroot \
  -w /var/www/certbot \
  -d "$DOMAIN" \
  -d "www.$DOMAIN" \
  --email "$EMAIL" \
  --agree-tos \
  --no-eff-email \
  --non-interactive

echo "=== Step 5: Switch to HTTPS Nginx config ==="
sed -i 's|./nginx/ec2-active.conf|./nginx/ec2.conf|' docker-compose.ec2.yml

echo "=== Step 6: Restart Nginx with HTTPS ==="
$COMPOSE up -d --force-recreate nginx

echo "=== Step 7: Start Certbot renewal container ==="
$COMPOSE up -d certbot

echo "=== SSL setup complete! ==="
echo "Visit https://$DOMAIN to verify."
