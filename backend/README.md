# DevPilot AI backend

FastAPI with async SQLModel/PostgreSQL. Request handling follows:

`routes -> services -> repositories -> database`

- `app/routes`: HTTP definitions, request validation, dependencies, and service calls.
- `app/services`: authentication, password hashing, ownership rules, and job status transitions.
- `app/repositories`: database queries, writes, commits, and rollbacks.
- `app/schemas`: request and public response models; password hashes are never returned.
- `app/core/dependencies.py`: session, repository, and service wiring.

## Run

From the repository root, enter the backend folder before running Python tools:

```powershell
cd backend
uv sync
```

Create `.env` with `DATABASE_URL=postgresql+asyncpg://USER:PASSWORD@localhost/devpilotai`
and `SECRET_KEY` set to a random secret of at least 32 bytes.

For a fresh database:

```powershell
uv run alembic upgrade head
uv run fastapi dev app/main.py
```

The initial migration creates all three tables. Existing manually created tables
must be reconciled with that migration before applying it.
Interactive API documentation is available at `/docs`.

The frontend runs on `http://localhost:3000` and proxies `/api` requests to this
backend during development. For a separately hosted frontend, set
`ALLOWED_ORIGINS` in `backend/.env` to a JSON list of permitted origins, for example
`ALLOWED_ORIGINS=["https://app.example.com"]`. Localhost port 3000 is allowed by default.

## Endpoints

Register with `POST /api/auth/register` (`full_name`, `email`, `password`).
Passwords must have at least 8 characters and at most 72 UTF-8 bytes.
Log in with `POST /api/auth/token` using form fields `username` (email) and `password`.
Send the returned token as `Authorization: Bearer <token>` for the endpoints below.

| Resource | Create | Read/list | Update | Delete |
| --- | --- | --- | --- | --- |
| Current user | `POST /api/auth/register` | `GET /api/users/me` | `PATCH /api/users/me` | `DELETE /api/users/me` |
| Repositories | `POST /api/repositories` | `GET /api/repositories`, `GET /api/repositories/{id}` | `PATCH /api/repositories/{id}` | `DELETE /api/repositories/{id}` |
| Analysis jobs | `POST /api/repositories/{id}/jobs` | `GET /api/repositories/{id}/jobs`, `GET /api/jobs/{uuid}` | `PATCH /api/jobs/{uuid}` | `DELETE /api/jobs/{uuid}` |

`GET /api/auth/users/me` is retained for existing clients. List endpoints accept
`offset` (default 0) and `limit` (default 20, maximum 100).

Create repositories with `full_name` and a matching GitHub HTTPS `clone_url`.
The backend verifies public repositories through GitHub's API and stores the returned
`github_repo_id`. Private repositories require GitHub authentication, which is not
configured yet.
Create jobs with `{}` or an optional `commit_sha`. Jobs start as `queued` and may
transition to `running` or `failed`; running jobs may become `completed` or
`failed`. The service sets `completed_at` when a job reaches a terminal status.
Job updates also accept `commit_sha`, `findings_summary`, and `error_message`.
These endpoints store job records; they do not execute analysis workers.

Users can only access their own repositories and jobs; inaccessible records
return 404. Deleting a user cascades to repositories and jobs; deleting a
repository cascades to its jobs. Successful creates return 201 and deletes 204.

## Verify

```powershell
uv run python -m unittest discover -s tests -v
```

Tests use an isolated in-memory SQLite database with foreign keys enabled, verify
CRUD, authentication, ownership, validation, cascades, and migration round trips,
and compile the migration SQL for PostgreSQL. They do not require a running
PostgreSQL server.
