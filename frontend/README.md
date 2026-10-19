# DevPilot AI frontend

A responsive developer workspace built on the existing TanStack Start, React,
TypeScript, and Vite scaffold. The interface uses charcoal surfaces, lavender
accents, a persistent desktop sidebar, and mobile navigation.

## Development

Use Node.js 22.12 or newer. Run the FastAPI backend on port 8000, then:

```powershell
npm install
npm run dev
```

Open http://localhost:3000. Register an account or sign in with an existing one.
The optional demo workspace uses clearly labeled sample data and makes no API
requests. Demo changes reset when you leave or reload.

## API connection

By default, requests go to `/api`. Vite forwards them to
`http://127.0.0.1:8000` in development. Copy `.env.example` to `.env` if you need to
change `API_PROXY_TARGET`.

For production, either configure a reverse proxy so `/api` reaches FastAPI, or
set `VITE_API_BASE_URL=https://your-backend.example.com/api` before building.
For a separate origin, configure the backend's `ALLOWED_ORIGINS` JSON list too.
Only public configuration belongs in `VITE_` variables; never put secrets there.

The session token is held in memory and session storage for the current browser
tab. It is sent as a bearer token, restored after a reload, cleared on sign-out,
and discarded when an authenticated API call returns 401.

## Features

- Registration, sign-in, session restoration, and sign-out.
- Overview with repository and analysis statistics from your account.
- Repository creation, search, editing, and confirmed deletion.
- Analysis creation, status/repository filters, commit search, findings, and deletion.
- Refreshes pending jobs every 15 seconds while the tab is visible.
- Profile, email, and password updates; confirmed account deletion.
- Empty, loading, validation, offline, and API error states.
- Keyboard-accessible native dialogs, labeled forms, and reduced-motion support.

Repository connection currently saves GitHub metadata; OAuth is not implemented.
Analysis creation queues a backend job record. Automated reviews require a worker,
which is not yet part of the backend. The UI does not simulate real review results.

## Structure

- `src/components`: application shell, authentication, dashboard, forms, and settings.
- `src/lib/api.ts`: typed API client, pagination, authorization, timeouts, and errors.
- `src/lib/use-workspace.ts`: workspace data loading, mutations, and polling.
- `src/lib/types.ts`: models matching the backend response schemas.
- `src/lib/demo.ts`: isolated sample data for the demo workspace.
- `src/styles.css`: responsive visual design.

## Verify and build

```powershell
npm run generate-routes
npm run typecheck
npm test
npm run build
npm start
```

The production server defaults to port 3000. Tests use Vitest, jsdom, and React
Testing Library for API contracts and interaction flows. Backend integration tests
are run separately from `backend` with `uv run python -m unittest discover -s tests -v`.
