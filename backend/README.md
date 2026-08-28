# Backend

Python microservices for the UDPT project.

## Layout

- `gateway/` — API Gateway (JWT, proxy routing)
- `libs/udpt_common/` — Shared library (auth, state machine, exceptions)
- `services/` — 8 business microservices

## Run one service locally

```bash
cd backend/services/contract-service
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
pip install -e ../../libs/udpt_common
uvicorn app.main:app --reload --port 8001
```

## Run all services

From project root:

```bash
make up
```
