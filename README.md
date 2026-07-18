(# BrightTrade

This repository contains the backend and frontend for BrightTrade. Below are deployment notes and required environment variables.

## Deployment environment variables

Set these variables in your deployment provider (Render, Docker, etc.). Do NOT commit real secrets to the repo.

- `DATABASE_URL` : Postgres connection string.
- `JWT_SECRET` : Secret used to sign JWTs.
- `ADMIN_EMAIL` : Email address to seed as the initial admin user.
- `ADMIN_PASSWORD` : Password for the seeded admin user (set securely in the provider's secret store).
- `ADMIN_FULLNAME` : Optional admin full name.

For local development, copy `backend/.env.example` to `backend/.env` and update values.

## How admin seeding works

On backend startup the server checks for `ADMIN_EMAIL` and `ADMIN_PASSWORD`. If present, it will create the admin user (or update an existing user) and mark it as verified with the `ADMIN` role.

### Security recommendation

- Use your hosting provider's secret manager (Render Dashboard environment settings, Docker Compose env file excluded from VCS, etc.) for `ADMIN_PASSWORD`.
- Change the admin password after first login and rotate `JWT_SECRET` for production.

## Docker Compose

`docker-compose.yml` already contains example admin env vars for local development. For production, remove them and set real secrets in the hosting environment.


