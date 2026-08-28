# Kubernetes Manifests (Minikube)

Deploy the UDPT stack to a local Kubernetes cluster (Minikube, kind, etc.).

## Prerequisites

- `kubectl` and a running cluster with the [NGINX Ingress Controller](https://kubernetes.github.io/ingress-nginx/deploy/)
- Docker images built and loaded into the cluster (same names as Docker Compose):

```bash
docker compose build
docker tag projectudpt-api-gateway udpt-gateway:latest          # adjust source tag if needed
docker tag projectudpt-contract-service udpt-contract-service:latest
docker tag projectudpt-pricing-service udpt-pricing-service:latest
docker tag projectudpt-operation-service udpt-operation-service:latest
docker tag projectudpt-billing-service udpt-billing-service:latest
docker tag projectudpt-workflow-service udpt-workflow-service:latest
docker tag projectudpt-notification-service udpt-notification-service:latest
docker tag projectudpt-audit-service udpt-audit-service:latest
docker tag projectudpt-esign-service udpt-esign-service:latest
docker tag projectudpt-frontend udpt-frontend:latest

# Minikube example
minikube image load udpt-gateway:latest udpt-contract-service:latest udpt-pricing-service:latest \
  udpt-operation-service:latest udpt-billing-service:latest udpt-workflow-service:latest \
  udpt-notification-service:latest udpt-audit-service:latest udpt-esign-service:latest udpt-frontend:latest
```

Or tag images explicitly during build: `docker build -t udpt-gateway:latest -f backend/gateway/Dockerfile .`

## Apply manifests

From the repository root:

```bash
# 1. Namespace and infrastructure
kubectl apply -f infra/k8s/namespace.yaml
kubectl apply -f infra/k8s/postgres/
kubectl apply -f infra/k8s/redis/
kubectl apply -f infra/k8s/kafka/

# 2. Shared app config (state machines, seed data, workflows)
kubectl create configmap udpt-app-config -n udpt \
  --from-file=seed_data.json=config/seed_data.json \
  --from-file=state_machines.json=config/state_machines.json \
  --from-file=workflow_definitions.json=config/workflow_definitions.json \
  --dry-run=client -o yaml | kubectl apply -f -

# 3. Application services (order matters: DB first, then backends, gateway, frontend)
kubectl apply -f infra/k8s/contract-service/
kubectl apply -f infra/k8s/pricing-service/
kubectl apply -f infra/k8s/operation-service/
kubectl apply -f infra/k8s/workflow-service/
kubectl apply -f infra/k8s/billing-service/
kubectl apply -f infra/k8s/notification-service/
kubectl apply -f infra/k8s/audit-service/
kubectl apply -f infra/k8s/esign-service/
kubectl apply -f infra/k8s/gateway/
kubectl apply -f infra/k8s/frontend/
kubectl apply -f infra/k8s/ingress.yaml
```

Wait for pods to become ready:

```bash
kubectl -n udpt get pods -w
```

## Access

Add to `/etc/hosts`:

```
127.0.0.1 udpt.local
```

Port-forward ingress (Minikube):

```bash
minikube tunnel   # or: kubectl port-forward -n ingress-nginx svc/ingress-nginx-controller 8080:80
```

- Frontend: http://udpt.local/
- API gateway: http://udpt.local/api/ (direct health: port-forward gateway pod → `/health`)

## Teardown

```bash
kubectl delete namespace udpt
```

## Layout

```
infra/k8s/
├── namespace.yaml
├── ingress.yaml
├── postgres/          # Deployment, Service, ConfigMap (init SQL)
├── redis/
├── kafka/             # Single-node Zookeeper + Kafka pod
├── gateway/
├── contract-service/  # port 8001
├── pricing-service/   # port 8002
├── operation-service/ # port 8003
├── billing-service/   # port 8004
├── workflow-service/  # port 8005
├── notification-service/ # port 8006
├── audit-service/     # port 8007
├── esign-service/     # port 8008
└── frontend/
```

All application pods mount the `udpt-app-config` ConfigMap at `/config` and expose `/health` liveness/readiness probes.
