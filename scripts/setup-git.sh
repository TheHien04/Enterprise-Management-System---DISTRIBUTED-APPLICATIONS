#!/usr/bin/env bash
# Run this AFTER installing Xcode Command Line Tools:
#   xcode-select --install
#
# Usage:
#   ./scripts/setup-git.sh                    # init + commit only
#   ./scripts/setup-git.sh github USER/REPO   # push to GitHub
#   ./scripts/setup-git.sh cursor REPO_NAME   # push to Cursor origin (needs origin CLI)

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! command -v git >/dev/null 2>&1; then
  echo "ERROR: git not found. Install Xcode Command Line Tools: xcode-select --install"
  exit 1
fi

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git init -b main
  echo "Initialized git repository."
fi

if [ -f .env ]; then
  echo "WARNING: .env exists — it is gitignored and will NOT be committed."
fi

git add -A
git status --short | head -30

if git diff --cached --quiet; then
  echo "Nothing to commit."
else
  git commit -m "$(cat <<'EOF'
chore: initial monorepo scaffold for UDPT

- FastAPI microservices (8) + API Gateway
- React/Vite frontend with role-based navigation
- Docker Compose (Postgres, Redis, Kafka, MinIO)
- Team docs: SERVICE_MAP, ARCHITECTURE, CODEOWNERS
EOF
)"
  echo "Committed."
fi

REMOTE_TARGET="${1:-}"
REMOTE_NAME="${2:-}"

if [ "$REMOTE_TARGET" = "github" ] && [ -n "$REMOTE_NAME" ]; then
  if git remote get-url origin >/dev/null 2>&1; then
    echo "Remote origin already exists: $(git remote get-url origin)"
  else
    git remote add origin "https://github.com/${REMOTE_NAME}.git"
  fi
  git push -u origin main
  echo "Pushed to https://github.com/${REMOTE_NAME}"
elif [ "$REMOTE_TARGET" = "cursor" ] && [ -n "$REMOTE_NAME" ]; then
  ORIGIN_BIN="${ORIGIN_BIN:-$HOME/.local/bin/origin}"
  if [ ! -x "$ORIGIN_BIN" ]; then
    echo "Install origin CLI first: curl -fsSL https://downloads.cursor.com/origin/install.sh | sh"
    exit 1
  fi
  CLONE_URL="$("$ORIGIN_BIN" repo create "$REMOTE_NAME" 2>/dev/null || true)"
  if [ -z "$CLONE_URL" ]; then
    echo "Run: origin auth login"
    echo "Then: origin repo create $REMOTE_NAME"
    exit 1
  fi
  git remote add origin "$CLONE_URL" 2>/dev/null || true
  git push -u origin main
  echo "Pushed to Cursor origin."
else
  echo ""
  echo "Local git ready. To push:"
  echo "  ./scripts/setup-git.sh github YOUR_USERNAME/udpt-enterprise"
  echo "  ./scripts/setup-git.sh cursor udpt-enterprise"
fi
