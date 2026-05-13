# CodeArena - Developer Makefile
# Usage: make <target>

.PHONY: help dev prod stop logs ps migrate seed test clean

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# ── Development ───────────────────────────────────────────────────────────────

dev: ## Start all services in dev mode with hot-reload
	docker compose up --build

dev-d: ## Start all services in dev mode (detached)
	docker compose up --build -d

stop: ## Stop all services
	docker compose down

stop-v: ## Stop all services and remove volumes (resets data)
	docker compose down -v

restart-api: ## Restart only the API service
	docker compose restart api

ps: ## Show status of all containers
	docker compose ps

logs: ## Follow logs from all services
	docker compose logs -f

logs-api: ## Follow API logs
	docker compose logs -f api

logs-worker: ## Follow Judge0 worker logs
	docker compose logs -f judge0_worker

# ── Database ──────────────────────────────────────────────────────────────────

migrate: ## Run Prisma migrations (dev)
	docker compose exec api npx prisma migrate dev

migrate-prod: ## Apply Prisma migrations (production)
	docker compose exec api npx prisma migrate deploy

seed: ## Seed the database with sample data
	docker compose exec api npm run seed

db-studio: ## Open Prisma Studio (database GUI)
	docker compose exec api npx prisma studio

db-reset: ## Reset database (WARNING: deletes all data)
	docker compose exec api npx prisma migrate reset --force

# ── Testing ───────────────────────────────────────────────────────────────────

test: ## Run backend tests
	docker compose exec api npm test

test-coverage: ## Run backend tests with coverage
	docker compose exec api npm run test:coverage

test-fe: ## Run frontend tests
	docker compose exec frontend npm test

# ── Production ────────────────────────────────────────────────────────────────

prod: ## Start in production mode (no override file)
	docker compose -f docker-compose.yml up -d --build

prod-stop: ## Stop production services
	docker compose -f docker-compose.yml down

# ── Utilities ─────────────────────────────────────────────────────────────────

shell-api: ## Open shell in API container
	docker compose exec api sh

shell-db: ## Open psql in database container
	docker compose exec postgres psql -U codearena codearena

shell-redis: ## Open redis-cli in Redis container
	docker compose exec redis redis-cli -a $$(grep REDIS_PASSWORD .env | cut -d= -f2)

clean: ## Remove all Docker build cache
	docker builder prune -f

generate-secrets: ## Generate secure random secrets for .env
	@echo "JWT_SECRET=$$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")"
	@echo "JWT_REFRESH_SECRET=$$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")"
	@echo "ENCRYPTION_KEY=$$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"

setup: ## First-time setup: copy .env.example, start services, migrate, seed
	@if [ ! -f .env ]; then cp .env.example .env; echo "✅ .env created — fill in your values before continuing"; exit 1; fi
	docker compose up -d --build
	@echo "Waiting for services to be ready..."
	@sleep 30
	docker compose exec api npx prisma migrate dev --name init
	docker compose exec api npm run seed
	@echo ""
	@echo "🎉 CodeArena is ready!"
	@echo "   Frontend: http://localhost"
	@echo "   API Docs: http://localhost/api/docs"
	@echo "   Admin:    admin@codearena.dev / Admin@123"
