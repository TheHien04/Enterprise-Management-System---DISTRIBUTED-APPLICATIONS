FROM python:3.11-slim

WORKDIR /app

COPY backend/libs/udpt_common /libs/udpt_common
RUN pip install --no-cache-dir /libs/udpt_common

COPY backend/services/billing-service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/services/billing-service/app ./app

ENV PYTHONPATH=/app
EXPOSE 8004

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8004"]
