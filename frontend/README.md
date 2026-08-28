# Frontend

React + Vite + TypeScript SPA for UDPT.

## Scripts

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
```

## Environment

Copy root `.env.example` values:

```
VITE_API_BASE_URL=http://localhost:8080
```

## Structure

- `src/api/` — HTTP client & API functions
- `src/pages/` — One folder per module (customers, contracts, ...)
- `src/routes/` — React Router + protected routes
- `src/context/AuthContext.tsx` — JWT session

Login uses Gateway `POST /api/v1/auth/login`.
