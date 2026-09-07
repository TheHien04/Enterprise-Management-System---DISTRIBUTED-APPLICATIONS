## Summary

<!-- What changed and why (1–3 bullets). -->

-

## Test plan

- [ ] `python -m compileall -q backend/gateway backend/libs backend/services backend/tests`
- [ ] `ruff check backend/gateway backend/libs backend/services backend/tests` (optional locally)
- [ ] `cd frontend && npm ci && npm run build`
- [ ] Relevant UI / API path exercised against `make up` when behaviour changes
- [ ] Docs updated if ownership, endpoints, or architecture changed

## Risk / notes

<!-- Rollback, migrations, demo credentials, out of scope. -->
