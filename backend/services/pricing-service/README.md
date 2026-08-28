# Pricing Service

Service catalog and price lists

- Port: `8002`
- Database: `pricing_db`
- Swagger: http://localhost:8002/docs

## Run locally

```bash
cd backend/services/pricing-service
pip install -r requirements.txt
pip install -e ../../libs/udpt_common
uvicorn app.main:app --reload --port 8002
```
