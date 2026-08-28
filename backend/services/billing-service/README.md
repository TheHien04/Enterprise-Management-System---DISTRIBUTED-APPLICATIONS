# Billing Service

Billing sheets and adjustments

- Port: `8004`
- Database: `billing_db`
- Swagger: http://localhost:8004/docs

## Run locally

```bash
cd backend/services/billing-service
pip install -r requirements.txt
pip install -e ../../libs/udpt_common
uvicorn app.main:app --reload --port 8004
```
