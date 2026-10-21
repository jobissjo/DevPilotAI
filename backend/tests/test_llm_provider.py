import os
from types import SimpleNamespace
import unittest
from unittest.mock import AsyncMock, MagicMock, patch

os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite://")
os.environ.setdefault("SECRET_KEY", "test-secret-key-with-at-least-32-bytes")
os.environ.setdefault("CELERY_BROKER_URL", "redis://127.0.0.1:6379/1")

from app.core.config import settings
from app.core.llm_provider import selected_llm
from app.services.question_service import answer_from_code
from app.agents.review_agents import parse_review_result, review_code


class ProviderSelectionTests(unittest.TestCase):
    def test_selects_groq(self):
        with patch.object(settings, "LLM_PROVIDER", "groq"), \
             patch.object(settings, "GROQ_API_KEY", "groq-test"):
            self.assertEqual(selected_llm(), ("groq", settings.GROQ_MODEL, "groq-test"))

    def test_selects_openrouter(self):
        with patch.object(settings, "LLM_PROVIDER", "openrouter"), \
             patch.object(settings, "OPENROUTER_API_KEY", "router-test"):
            self.assertEqual(
                selected_llm(),
                ("openrouter", settings.OPENROUTER_MODEL, "router-test"),
            )

    def test_missing_selected_key_has_clear_error(self):
        with patch.object(settings, "LLM_PROVIDER", "openrouter"), \
             patch.object(settings, "OPENROUTER_API_KEY", None):
            with self.assertRaisesRegex(ValueError, "OPENROUTER_API_KEY"):
                selected_llm()


class ReviewParsingTests(unittest.TestCase):
    def test_normalizes_severity_and_validates_findings(self):
        result = parse_review_result(
            '```json\n{"findings": [{"line": 3, "severity": "Medium", '
            '"title": "Issue", "explanation": "Why", "evidence": "code"}]}\n```'
        )
        self.assertEqual(result.findings[0].severity, "medium")

    def test_skips_unknown_severity_without_losing_valid_findings(self):
        result = parse_review_result(
            '{"findings": [{"line": 3, "severity": "unclear", '
            '"title": "Issue", "explanation": "Why", "evidence": "code"}, '
            '{"line": 4, "severity": "low", "title": "Other", '
            '"explanation": "Why", "evidence": "other code"}]}'
        )
        self.assertEqual([finding.title for finding in result.findings], ["Other"])

    def test_openrouter_reviewer_does_not_receive_groq_options(self):
        with patch("app.agents.review_agents.selected_llm", return_value=(
            "openrouter", "meta-llama/llama-3.3-70b-instruct", "router-test"
        )), patch("app.agents.review_agents.LLM") as llm, \
             patch("app.agents.review_agents.run_reviewer", return_value=[]):
            result = review_code("auth.py", "pass")
        self.assertEqual(result, {"quality": [], "security": []})
        options = llm.call_args.kwargs
        self.assertEqual(options["model"], "openrouter/meta-llama/llama-3.3-70b-instruct")
        self.assertNotIn("reasoning_effort", options)


class OpenRouterQuestionTests(unittest.IsolatedAsyncioTestCase):
    async def test_answer_uses_openrouter_endpoint_and_model(self):
        completion = SimpleNamespace(
            choices=[SimpleNamespace(message=SimpleNamespace(content="Login is in auth.py [1]."))]
        )
        client = MagicMock()
        client.__aenter__ = AsyncMock(return_value=client)
        client.__aexit__ = AsyncMock(return_value=None)
        client.chat.completions.create = AsyncMock(return_value=completion)
        matches = [{
            "source": "auth.py", "start_line": 4, "end_line": 8,
            "content": "def login(): pass",
        }]
        with patch("app.services.question_service.selected_llm", return_value=(
            "openrouter", "meta-llama/llama-3.3-70b-instruct", "router-test"
        )), patch("app.services.question_service.AsyncOpenAI", return_value=client) as factory:
            answer = await answer_from_code("Where is login?", matches)

        self.assertEqual(answer, "Login is in auth.py [1].")
        factory.assert_called_once_with(
            api_key="router-test", base_url="https://openrouter.ai/api/v1"
        )
        request = client.chat.completions.create.await_args.kwargs
        self.assertEqual(request["model"], "meta-llama/llama-3.3-70b-instruct")
        self.assertIn("auth.py:4-8", request["messages"][1]["content"])
