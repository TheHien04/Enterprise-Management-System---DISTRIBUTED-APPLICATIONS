# Git Setup

Repo: **https://github.com/TheHien04/Enterprise-Management-System**

## Step 1 — Rename repo on GitHub (one time)

GitHub → **Settings** → **General** → Repository name → `Enterprise-Management-System` → **Rename**

## Step 2 — Push code from your machine

```bash
cd "/Users/macbookofjimmy/Documents/Project UDPT"
git remote set-url origin https://github.com/TheHien04/Enterprise-Management-System.git
git push -u origin main
```

If GitHub asks for login, use a **Personal Access Token** (not your account password).

## Step 3 — Invite teammates

GitHub → **Settings** → **Collaborators** → add team members

## Alternative — Cursor origin

```bash
curl -fsSL https://downloads.cursor.com/origin/install.sh | sh
~/.local/bin/origin auth login
./scripts/setup-git.sh cursor udpt-enterprise
```

## After push — tell your team

1. Clone the repo
2. Read **`docs/SERVICE_MAP.md`** — find your service in 30 seconds
3. Read **`CONTRIBUTING.md`** — branch naming & conventions
4. Run `cp .env.example .env && make up`
