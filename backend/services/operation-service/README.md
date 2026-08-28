# Operation Service

Volume records and period locking

- Port: `8003`
- Database: `operation_db`
- Swagger: http://localhost:8003/docs

## Run locally

```bash
cd backend/services/operation-service
pip install -r requirements.txt
pip install -e ../../libs/udpt_common
uvicorn app.main:app --reload --port 8003
```
