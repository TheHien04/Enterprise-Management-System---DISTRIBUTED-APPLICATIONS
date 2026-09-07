# Security policy

## Supported versions

This project is maintained for coursework demonstration. Security fixes are applied on the `main` branch only.

## Reporting a vulnerability

Please **do not** open a public GitHub issue for security-sensitive findings.

Contact the repository maintainers privately (course team leads listed in [docs/TEAM_ASSIGNMENT.md](docs/TEAM_ASSIGNMENT.md)) with:

- Affected component (gateway, service name, or frontend route)
- Steps to reproduce
- Impact assessment (auth bypass, data exposure, etc.)

We will acknowledge the report and coordinate a fix before any public disclosure.

## Known course-scope limitations

The following are intentional for a local demo environment and should not be treated as production hardening:

- Demo credentials where password equals username
- Local JWT secrets from `.env.example`
- No SSO / MFA
- Compose-oriented networking without multi-region disaster recovery
