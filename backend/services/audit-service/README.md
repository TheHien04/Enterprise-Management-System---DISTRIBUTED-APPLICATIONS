# Audit Service

Immutable audit logs

- Port: `8007`
- Database: `support_db`
- Swagger: http://localhost:8007/docs

## Run locally

```bash
cd backend/services/audit-service
pip install -r requirements.txt
pip install -e ../../libs/udpt_common
uvicorn app.main:app --reload --port 8007
```
