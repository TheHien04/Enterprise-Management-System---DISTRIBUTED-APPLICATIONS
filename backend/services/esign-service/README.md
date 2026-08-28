# E-Sign Service

Digital signing integration

- Port: `8008`
- Database: `support_db`
- Swagger: http://localhost:8008/docs

## Run locally

```bash
cd backend/services/esign-service
pip install -r requirements.txt
pip install -e ../../libs/udpt_common
uvicorn app.main:app --reload --port 8008
```
