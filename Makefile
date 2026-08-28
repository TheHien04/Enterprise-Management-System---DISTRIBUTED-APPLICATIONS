.PHONY: help up down build logs ps clean

help:
	@echo "UDPT - Enterprise Business Management System"
	@echo ""
	@echo "  make up       Start all services (Docker Compose)"
	@echo "  make down     Stop all services"
	@echo "  make build    Build all Docker images"
	@echo "  make logs     Tail logs"
	@echo "  make ps       Show running containers"
	@echo "  make clean    Remove containers and volumes"

up:
	docker compose up -d --build

down:
	docker compose down

build:
	docker compose build

logs:
	docker compose logs -f

ps:
	docker compose ps

clean:
	docker compose down -v
