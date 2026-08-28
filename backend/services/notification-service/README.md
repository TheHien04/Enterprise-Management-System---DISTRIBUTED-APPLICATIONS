# Notification Service

Async notifications

- Port: `8006`
- Database: `support_db`
- Swagger: http://localhost:8006/docs

## Run locally

```bash
cd backend/services/notification-service
pip install -r requirements.txt
pip install -e ../../libs/udpt_common
uvicorn app.main:app --reload --port 8006
```
