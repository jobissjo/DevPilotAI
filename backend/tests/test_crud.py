import ast
import importlib.util
from io import StringIO
import os
from datetime import UTC, datetime, timedelta
from pathlib import Path
import unittest
import uuid
from unittest.mock import AsyncMock, patch

BACKEND_DIR = Path(__file__).resolve().parents[1]

os.environ["DATABASE_URL"] = "sqlite+aiosqlite://"
os.environ["SECRET_KEY"] = "test-secret-key-with-at-least-32-bytes"

import httpx
import jwt
from alembic.autogenerate import compare_metadata
from alembic.migration import MigrationContext
from alembic.operations import Operations
from sqlalchemy import create_engine, event, inspect
from sqlalchemy.ext.asyncio import create_async_engine
from sqlmodel import SQLModel, select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.config import settings
from app.core.database import get_session
from app.main import app
from app.models import AnalysisJob, Repository, User
from app.repositories.base import RepositoryConflict
from app.repositories.user import UserRepository
from app.services.repository_service import github_repository_id
from app.core.errors import ServiceError


class CrudTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.github_lookup = patch(
            "app.services.repository_service.github_repository_id",
            new_callable=AsyncMock,
            return_value=123,
        )
        self.github_lookup.start()
        self.addCleanup(self.github_lookup.stop)
        self.engine = create_async_engine("sqlite+aiosqlite://")

        @event.listens_for(self.engine.sync_engine, "connect")
        def enable_foreign_keys(connection, _):
            connection.execute("PRAGMA foreign_keys=ON")

        async with self.engine.begin() as connection:
            await connection.run_sync(SQLModel.metadata.create_all)

        async def session_override():
            async with AsyncSession(self.engine) as session:
                yield session

        app.dependency_overrides[get_session] = session_override
        self.client = httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://test",
        )
        self.headers = await self.register_and_login("owner@example.com")

    async def asyncTearDown(self):
        await self.client.aclose()
        app.dependency_overrides.clear()
        await self.engine.dispose()

    async def register_and_login(self, email):
        response = await self.client.post("/api/auth/register", json={
            "full_name": "Test User", "email": email, "password": "password123",
        })
        self.assertEqual(response.status_code, 201, response.text)
        self.assertNotIn("password", response.json())
        response = await self.client.post("/api/auth/token", data={
            "username": email, "password": "password123",
        })
        self.assertEqual(response.status_code, 200, response.text)
        return {"Authorization": "Bearer " + response.json()["access_token"]}

    async def create_repository(self):
        response = await self.client.post("/api/repositories", headers=self.headers, json={
            "full_name": "owner/project",
            "clone_url": "https://github.com/owner/project.git",
        })
        self.assertEqual(response.status_code, 201, response.text)
        return response.json()["id"]

    async def create_job(self, repo_id):
        response = await self.client.post(
            f"/api/repositories/{repo_id}/jobs", headers=self.headers,
            json={"commit_sha": "abc123"},
        )
        self.assertEqual(response.status_code, 201, response.text)
        self.assertEqual(response.json()["status"], "queued")
        return response.json()["id"]

    async def test_user_crud_and_password_change(self):
        for path in ("/api/users/me", "/api/auth/users/me"):
            response = await self.client.get(path, headers=self.headers)
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.json()["email"], "owner@example.com")
        response = await self.client.patch("/api/users/me", headers=self.headers, json={
            "full_name": "Updated", "password": "newpassword123", "email": "new@example.com",
        })
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["full_name"], "Updated")
        self.assertNotIn("password", response.json())
        for password, expected in (("password123", 401), ("newpassword123", 200)):
            response = await self.client.post("/api/auth/token", data={
                "username": "new@example.com", "password": password,
            })
            self.assertEqual(response.status_code, expected)
        response = await self.client.delete("/api/users/me", headers=self.headers)
        self.assertEqual(response.status_code, 204)
        self.assertEqual(response.content, b"")
        response = await self.client.get("/api/users/me", headers=self.headers)
        self.assertEqual(response.status_code, 401)

    async def test_duplicate_email_and_invalid_login(self):
        response = await self.client.post("/api/auth/register", json={
            "full_name": "Duplicate", "email": "owner@example.com", "password": "password123",
        })
        self.assertEqual(response.status_code, 400)
        await self.register_and_login("other@example.com")
        response = await self.client.patch("/api/users/me", headers=self.headers,
                                           json={"email": "other@example.com"})
        self.assertEqual(response.status_code, 400)
        for email in ("owner@example.com", "missing@example.com"):
            response = await self.client.post("/api/auth/token", data={
                "username": email, "password": "incorrect",
            })
            self.assertEqual(response.status_code, 401)
            self.assertEqual(response.headers["www-authenticate"], "Bearer")
        response = await self.client.post("/api/auth/token", data={
            "username": "owner@example.com", "password": "x" * 100,
        })
        self.assertEqual(response.status_code, 401)

    async def test_repository_crud_and_pagination(self):
        repo_id = await self.create_repository()
        self.assertEqual(
            (await self.client.get(f"/api/repositories/{repo_id}", headers=self.headers)).json()["github_repo_id"],
            123,
        )
        response = await self.client.get(f"/api/repositories/{repo_id}", headers=self.headers)
        self.assertEqual(response.status_code, 200)
        response = await self.client.patch(f"/api/repositories/{repo_id}", headers=self.headers,
                                           json={"full_name": "owner/renamed"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["full_name"], "owner/renamed")
        self.assertEqual(response.json()["github_repo_id"], 123)
        response = await self.client.get("/api/repositories?limit=1", headers=self.headers)
        self.assertEqual(len(response.json()), 1)
        response = await self.client.get("/api/repositories?offset=1", headers=self.headers)
        self.assertEqual(response.json(), [])
        response = await self.client.delete(f"/api/repositories/{repo_id}", headers=self.headers)
        self.assertEqual(response.status_code, 204)
        self.assertEqual(response.content, b"")
        response = await self.client.get(f"/api/repositories/{repo_id}", headers=self.headers)
        self.assertEqual(response.status_code, 404)

    async def test_job_crud_and_transitions(self):
        repo_id = await self.create_repository()
        job_id = await self.create_job(repo_id)
        url = f"/api/jobs/{job_id}"
        response = await self.client.get(url, headers=self.headers)
        self.assertEqual(response.status_code, 200)
        response = await self.client.get(f"/api/repositories/{repo_id}/jobs", headers=self.headers)
        self.assertEqual(len(response.json()), 1)
        response = await self.client.patch(url, headers=self.headers, json={"status": "completed"})
        self.assertEqual(response.status_code, 409)
        response = await self.client.patch(url, headers=self.headers, json={"status": "running"})
        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.json()["completed_at"])
        response = await self.client.patch(url, headers=self.headers, json={
            "status": "completed", "findings_summary": {"issues": 3},
        })
        self.assertEqual(response.status_code, 200)
        self.assertIsNotNone(response.json()["completed_at"])
        self.assertEqual(response.json()["findings_summary"], {"issues": 3})
        response = await self.client.patch(url, headers=self.headers, json={"status": "running"})
        self.assertEqual(response.status_code, 409)
        response = await self.client.patch(url, headers=self.headers, json={"findings_summary": None})
        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.json()["findings_summary"])
        response = await self.client.delete(url, headers=self.headers)
        self.assertEqual(response.status_code, 204)
        response = await self.client.get(url, headers=self.headers)
        self.assertEqual(response.status_code, 404)

    async def test_failed_job_has_completion_time(self):
        repo_id = await self.create_repository()
        job_id = await self.create_job(repo_id)
        response = await self.client.patch(f"/api/jobs/{job_id}", headers=self.headers, json={
            "status": "failed", "error_message": "Clone failed",
        })
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["error_message"], "Clone failed")
        self.assertIsNotNone(response.json()["completed_at"])

    async def test_owner_isolation_for_all_operations(self):
        repo_id = await self.create_repository()
        job_id = await self.create_job(repo_id)
        other = await self.register_and_login("other@example.com")
        response = await self.client.get("/api/repositories", headers=other)
        self.assertEqual(response.json(), [])
        for method, path, body in (
            ("GET", f"/api/repositories/{repo_id}", None),
            ("PATCH", f"/api/repositories/{repo_id}", {"full_name": "stolen"}),
            ("DELETE", f"/api/repositories/{repo_id}", None),
            ("GET", f"/api/repositories/{repo_id}/jobs", None),
            ("POST", f"/api/repositories/{repo_id}/jobs", {}),
            ("GET", f"/api/jobs/{job_id}", None),
            ("PATCH", f"/api/jobs/{job_id}", {"status": "failed"}),
            ("DELETE", f"/api/jobs/{job_id}", None),
        ):
            with self.subTest(method=method, path=path):
                response = await self.client.request(method, path, headers=other, json=body)
                self.assertEqual(response.status_code, 404, response.text)

    async def test_cascade_deletes(self):
        repo_id = await self.create_repository()
        await self.create_job(repo_id)
        response = await self.client.delete(f"/api/repositories/{repo_id}", headers=self.headers)
        self.assertEqual(response.status_code, 204)
        async with AsyncSession(self.engine) as session:
            self.assertEqual(list((await session.exec(select(AnalysisJob))).all()), [])
        repo_id = await self.create_repository()
        await self.create_job(repo_id)
        response = await self.client.delete("/api/users/me", headers=self.headers)
        self.assertEqual(response.status_code, 204)
        async with AsyncSession(self.engine) as session:
            for model in (User, Repository, AnalysisJob):
                self.assertEqual(list((await session.exec(select(model))).all()), [])

    async def test_invalid_tokens_and_missing_authentication(self):
        tokens = [None, "bad-token"]
        for sub, token_type, expires in (
            ("invalid-id", "access", 30), ("1", "refresh", 30),
            ("1", "access", -30), ("999999", "access", 30),
            (str(2**100), "access", 30),
        ):
            tokens.append(jwt.encode({
                "sub": sub, "token_type": token_type,
                "exp": datetime.now(UTC) + timedelta(minutes=expires),
            }, settings.SECRET_KEY, algorithm=settings.ALGORITHM))
        tokens.append(jwt.encode({"sub": "1"}, settings.SECRET_KEY, algorithm=settings.ALGORITHM))
        for token in tokens:
            headers = {} if token is None else {"Authorization": "Bearer " + token}
            response = await self.client.get("/api/users/me", headers=headers)
            self.assertEqual(response.status_code, 401, response.text)
            self.assertEqual(response.headers["www-authenticate"], "Bearer")

    async def test_validation_and_missing_records(self):
        repo_id = await self.create_repository()
        job_id = await self.create_job(repo_id)
        for path, body in (
            ("/api/users/me", {"email": None}),
            ("/api/users/me", {"email": "invalid"}),
            ("/api/users/me", {"password": "short"}),
            ("/api/users/me", {"password": "é" * 40}),
            (f"/api/repositories/{repo_id}", {"full_name": None}),
            (f"/api/repositories/{repo_id}", {"clone_url": "invalid"}),
            (f"/api/jobs/{job_id}", {"status": None}),
            (f"/api/jobs/{job_id}", {"status": "invalid"}),
        ):
            response = await self.client.patch(path, headers=self.headers, json=body)
            self.assertEqual(response.status_code, 422, response.text)
        for query in ("limit=0", "limit=101", "offset=-1"):
            response = await self.client.get("/api/repositories?" + query, headers=self.headers)
            self.assertEqual(response.status_code, 422)
        for path in ("/api/repositories/9999", f"/api/jobs/{uuid.uuid4()}"):
            response = await self.client.get(path, headers=self.headers)
            self.assertEqual(response.status_code, 404)

    async def test_integrity_conflict_rolls_back_session(self):
        async with AsyncSession(self.engine) as session:
            repository = UserRepository(session)
            with self.assertRaises(RepositoryConflict):
                await repository.save(User(full_name="Duplicate", email="owner@example.com", password="hash"))
            self.assertIsNotNone(await repository.get_by_email("owner@example.com"))

    async def test_frontend_cors_preflight(self):
        response = await self.client.options("/api/repositories", headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "authorization,content-type",
        })
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers["access-control-allow-origin"], "http://localhost:3000")
        response = await self.client.options("/api/repositories", headers={
            "Origin": "https://untrusted.example",
            "Access-Control-Request-Method": "POST",
        })
        self.assertEqual(response.status_code, 400)
        self.assertNotIn("access-control-allow-origin", response.headers)


class GitHubLookupTests(unittest.IsolatedAsyncioTestCase):
    async def test_fetches_id_for_matching_repository(self):
        response = httpx.Response(200, json={"id": 456, "full_name": "owner/project"},
                                  request=httpx.Request("GET", "https://api.github.com/repos/owner/project"))
        with patch("httpx.AsyncClient.get", new_callable=AsyncMock, return_value=response) as get:
            repo_id = await github_repository_id(
                "owner/project", "https://github.com/owner/project.git"
            )
        self.assertEqual(repo_id, 456)
        self.assertEqual(get.await_args.args[0], "https://api.github.com/repos/owner/project")

    async def test_rejects_mismatched_clone_url_before_lookup(self):
        with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as get:
            with self.assertRaises(ServiceError) as error:
                await github_repository_id("owner/project", "https://github.com/other/project.git")
        self.assertEqual(error.exception.status_code, 422)
        get.assert_not_awaited()

    async def test_handles_missing_repository(self):
        response = httpx.Response(404, request=httpx.Request("GET", "https://api.github.com/repos/owner/project"))
        with patch("httpx.AsyncClient.get", new_callable=AsyncMock, return_value=response):
            with self.assertRaises(ServiceError) as error:
                await github_repository_id("owner/project", "https://github.com/owner/project.git")
        self.assertEqual(error.exception.status_code, 404)


class ArchitectureTests(unittest.TestCase):
    def test_route_handlers_only_delegate_to_services(self):
        for path in (BACKEND_DIR / "app/routes").glob("*.py"):
            tree = ast.parse(path.read_text(encoding="utf-8"))
            for node in tree.body:
                if isinstance(node, ast.AsyncFunctionDef):
                    with self.subTest(path=path, function=node.name):
                        self.assertEqual(len(node.body), 1)
                        self.assertIsInstance(node.body[0], ast.Return)
                        call = node.body[0].value.value
                        self.assertIsInstance(call, ast.Call)
                        self.assertEqual(call.func.value.id, "service")


class MigrationTests(unittest.TestCase):
    def setUp(self):
        spec = importlib.util.spec_from_file_location(
            "initial", BACKEND_DIR / "migrations/versions/0001_initial.py",
        )
        self.migration = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(self.migration)

    def test_upgrade_matches_models_and_downgrade_removes_tables(self):
        engine = create_engine("sqlite://")
        try:
            with engine.begin() as connection:
                context = MigrationContext.configure(connection)
                with Operations.context(context):
                    self.migration.upgrade()
                    self.assertEqual(compare_metadata(context, SQLModel.metadata), [])
                    self.migration.downgrade()
                    self.assertEqual(inspect(connection).get_table_names(), [])
        finally:
            engine.dispose()

    def test_postgresql_migration_sql(self):
        output = StringIO()
        context = MigrationContext.configure(dialect_name="postgresql", opts={
            "as_sql": True, "output_buffer": output,
        })
        with Operations.context(context):
            self.migration.upgrade()
            self.migration.downgrade()
        self.assertIn("CREATE TABLE analysis_jobs", output.getvalue())
        self.assertIn("ON DELETE CASCADE", output.getvalue())
        self.assertIn("DROP TYPE jobstatus", output.getvalue())


if __name__ == "__main__":
    unittest.main()
