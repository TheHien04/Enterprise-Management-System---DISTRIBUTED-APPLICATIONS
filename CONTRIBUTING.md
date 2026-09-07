# Contributing

This repository is a course implementation artefact. Contributions from the project team are welcome via pull requests against `main`.

## Workflow

1. Create a short-lived branch from `main` (`feat/…`, `fix/…`, or `docs/…`).
2. Keep changes scoped to one service or one concern when possible.
3. Run local checks before opening a pull request:
   - Backend: `python -m compileall -q backend/gateway backend/libs backend/services backend/tests`
   - Lint: `ruff check backend/gateway backend/libs backend/services backend/tests`
   - Frontend: `cd frontend && npm ci && npm run build` (Node 20; see `frontend/.nvmrc`)
   - Full stack (optional): `make up`, then exercise the relevant UI path
4. Update `docs/SERVICE_MAP.md` or `docs/TEAM_ASSIGNMENT.md` if ownership or endpoints change.
5. Note user-facing changes in `CHANGELOG.md` under **Unreleased**.
6. Open a pull request using the repository template (summary + test plan).

## Ownership

See [CODEOWNERS](CODEOWNERS) and [docs/TEAM_ASSIGNMENT.md](docs/TEAM_ASSIGNMENT.md) for module owners. Prefer requesting review from the owning teammate.

## Coding conventions

- Python 3.11+, FastAPI services under `backend/services/`
- Shared domain helpers live in `backend/libs/udpt_common/` — avoid duplicating auth, outbox, or state-machine logic
- React/TypeScript portal under `frontend/`; call the API Gateway only (`localhost:8080`), never service ports directly from the browser
- Do not commit `.env`, secrets, or local zip packages (`*.zip` is gitignored)
