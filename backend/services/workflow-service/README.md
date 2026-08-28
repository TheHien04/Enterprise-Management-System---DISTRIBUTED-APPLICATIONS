# Workflow Service

Configurable approval workflows

- Port: `8005`
- Database: `workflow_db`
- Swagger: http://localhost:8005/docs

## Run locally

```bash
cd backend/services/workflow-service
pip install -r requirements.txt
pip install -e ../../libs/udpt_common
uvicorn app.main:app --reload --port 8005
```
