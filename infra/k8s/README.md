# Kubernetes Manifests (Minikube)

> Placeholder for deployment manifests required by the assignment.

Planned structure:

```
infra/k8s/
├── namespace.yaml
├── postgres/
├── redis/
├── kafka/
├── gateway/
├── contract-service/
├── pricing-service/
├── operation-service/
├── billing-service/
├── workflow-service/
├── notification-service/
├── audit-service/
├── esign-service/
└── frontend/
```

Each service: `Deployment`, `Service`, `ConfigMap`, `Secret`.

Run locally with Docker Compose first (`make up`), then port manifests here.
