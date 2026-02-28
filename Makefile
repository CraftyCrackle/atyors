.PHONY: help dev up down build logs status health clean ssl-setup test deploy-ec2

help:
	@echo "atyors.com Development Commands"
	@echo "================================"
	@echo ""
	@echo "Development:"
	@echo "  make dev          - Build and start all services"
	@echo "  make up           - Start all services"
	@echo "  make down         - Stop all services"
	@echo "  make build        - Build all Docker images"
	@echo "  make clean        - Remove containers, volumes, and prune"
	@echo ""
	@echo "Monitoring:"
	@echo "  make logs         - Tail logs for all services"
	@echo "  make status       - Show container status"
	@echo "  make health       - Check service health endpoints"
	@echo ""
	@echo "Testing:"
	@echo "  make test         - Run all tests"
	@echo "  make test-api     - Run API tests only"
	@echo "  make test-web     - Run web tests only"
	@echo ""
	@echo "Per-service:"
	@echo "  make logs-api     - API logs"
	@echo "  make logs-web     - Web logs"
	@echo "  make restart-api  - Restart API"
	@echo "  make restart-web  - Restart web"
	@echo ""

dev: ssl-setup
	@echo "Starting atyors dev environment..."
	@docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build -d
	@echo ""
	@echo "Services:"
	@echo "  App (via Nginx): http://localhost:8000"
	@echo "  Web (direct):    http://localhost:3001"
	@echo "  API (direct):    http://localhost:8081"

up:
	@docker compose up -d

down:
	@docker compose down

build:
	@docker compose build

clean:
	@docker compose down -v --remove-orphans
	@docker system prune -f
	@echo "Cleanup complete."

logs:
	@docker compose logs -f

status:
	@docker compose ps

health:
	@echo "Nginx:   $$(curl -s -o /dev/null -w '%{http_code}' http://localhost:8000/health || echo DOWN)"
	@echo "API:     $$(curl -s -o /dev/null -w '%{http_code}' http://localhost:8081/api/v1/health || echo DOWN)"
	@echo "Web:     $$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3001 || echo DOWN)"

ssl-setup:
	@if [ ! -f nginx/ssl/localhost.crt ] || [ ! -f nginx/ssl/localhost.key ]; then \
		echo "Generating self-signed SSL certificate..."; \
		mkdir -p nginx/ssl; \
		openssl req -x509 -newkey rsa:4096 -keyout nginx/ssl/localhost.key -out nginx/ssl/localhost.crt -days 365 -nodes -subj "/C=US/ST=State/L=City/O=atyors/CN=localhost" 2>/dev/null; \
		echo "SSL certificates generated."; \
	fi

test:
	@echo "Running API tests..."
	@cd /Users/borgella/Desktop/atyors_com && npm test
	@echo "Running web tests..."
	@cd apps/web && npm test

test-api:
	@npm test

test-web:
	@cd apps/web && npm test

logs-%:
	@docker compose logs -f $*

restart-%:
	@docker compose restart $*
	@echo "$* restarted."

run-%:
	@docker compose up -d $*

stop-%:
	@docker compose stop $*

deploy-ec2:
	@echo "Deploying to EC2..."
	@docker compose -f docker-compose.yml -f docker-compose.ec2.yml up --build -d
	@echo "EC2 deployment complete."
