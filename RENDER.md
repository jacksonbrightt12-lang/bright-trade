Hosting this repo on Render

Steps

1. Connect this GitHub repository to Render.
2. Use the `render.yaml` blueprint (committed) or create services manually:
   - Create a Web Service for the backend using the `backend/dockerfile`.
   - Create a Web Service for the frontend using the `frontend/dockerfile`.
   - Create a Managed Postgres database (Starter plan or chosen plan).
3. In the backend service environment variables set:
   - `DATABASE_URL` to the Postgres connection string provided by Render (from the managed DB dashboard).
   - `JWT_SECRET` to a strong random value.
   - Any other secrets (SMTP, third-party keys) via the Render dashboard's Secrets.
4. For database migrations / schema push, run in the backend deploy or a one-off job:
   - `npx prisma db push` (or use your migration commands).
5. After services are created, redeploy. Verify the frontend points to the backend API by setting `VITE_API_URL` in the frontend service (if needed).

Notes
- The repository includes `backend/dockerfile` and `frontend/dockerfile`—the blueprint uses those.
- Rotate any credentials you replaced earlier; ensure `.env` files are not committed.
- If you prefer not to use Docker on Render, configure the services as Node static/web services and set build/start commands:
  - Backend build: `npm install && npm run build`
  - Backend start: `npm start`
  - Frontend build: `npm install && npm run build`
