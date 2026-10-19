# DevPilot AI

The backend and frontend live in separate folders:

```text
DevPilotAI/
  backend/       FastAPI app, repositories, services, migrations, and tests
  frontend/      TanStack Start + React dashboard and API integration
  task_tracker.MD
```

## Start the backend

```powershell
cd backend
uv sync
uv run fastapi dev app/main.py
```

Backend settings are in `backend/.env`. For a fresh database, run
`uv run alembic upgrade head` from `backend` before starting the app.

See [backend/README.md](backend/README.md) for configuration, endpoints, and tests.
## Start the frontend

In a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`. Sign up or sign in to use your backend, or choose
**Explore the demo workspace** to review the design using sample data.
Development API requests are forwarded to `http://127.0.0.1:8000`.

See [frontend/README.md](frontend/README.md) for integration settings and checks.
