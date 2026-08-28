# Git Setup

Git cannot run on this machine until **Xcode Command Line Tools** are installed.

## Step 1 — Install tools (one time)

```bash
xcode-select --install
```

Wait for installation to finish, then restart Terminal.

## Step 2 — Push to GitHub (recommended for team)

1. Create an empty repo on GitHub: `udpt-enterprise` (Private)
2. Run:

```bash
cd "/Users/macbookofjimmy/Documents/Project UDPT"
chmod +x scripts/setup-git.sh
./scripts/setup-git.sh github YOUR_GITHUB_USERNAME/udpt-enterprise
```

3. Invite teammates: GitHub → Settings → Collaborators

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
