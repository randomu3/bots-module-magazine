.PHONY: help install dev build test clean docker-dev docker-build docker-down

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: ## Install dependencies
	npm install

dev: ## Start development servers
	npm run dev

build: ## Build production version
	npm run build

test: ## Run tests
	npm run test

clean: ## Clean build artifacts and node_modules
	rm -rf node_modules
	rm -rf backend/node_modules
	rm -rf frontend/node_modules
	rm -rf backend/dist
	rm -rf frontend/.next

docker-dev: ## Start development environment with Docker
	docker-compose -f docker-compose.dev.yml up --build

docker-build: ## Build production Docker images
	docker-compose build

docker-down: ## Stop Docker containers
	docker-compose down
	docker-compose -f docker-compose.dev.yml down

setup-env: ## Copy environment files
	cp .env.example .env
	cp backend/.env.example backend/.env
	cp frontend/.env.example frontend/.env
	@echo "Environment files created. Please edit them with your configuration."

logs: ## Show Docker logs
	docker-compose logs -f

db-reset: ## Reset database (development only)
	docker-compose -f docker-compose.dev.yml down -v
	docker-compose -f docker-compose.dev.yml up postgres -d
	sleep 5
	docker-compose -f docker-compose.dev.yml exec postgres psql -U postgres -c "DROP DATABASE IF EXISTS telegram_bot_platform;"
	docker-compose -f docker-compose.dev.yml exec postgres psql -U postgres -c "CREATE DATABASE telegram_bot_platform;"