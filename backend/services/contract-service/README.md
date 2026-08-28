# Contract Service

Customers, contracts, appendices

- Port: `8001`
- Database: `contract_db`
- Swagger: http://localhost:8001/docs

## Run locally

```bash
cd backend/services/contract-service
pip install -r requirements.txt
pip install -e ../../libs/udpt_common
uvicorn app.main:app --reload --port 8001
```
