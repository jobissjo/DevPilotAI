import json

from app.core.llm_provider import selected_llm
from app.schemas.agent_schemas import TestPlanSchema, TestSuggestionSchema
from crewai import LLM, Agent, Crew, Process, Task
from pydantic import ValidationError


def generate_tests(source: str, code: str) -> list[dict]:
    provider, model, api_key = selected_llm()
    options = (
        {
            "reasoning_effort": "low",
            "allowed_openai_params": ["reasoning_effort"],
        }
        if provider == "groq"
        else {}
    )
    llm = LLM(
        model=f"{provider}/{model}",
        api_key=api_key,
        temperature=0,
        max_tokens=4096,
        **options,
    )

    agent = Agent(
        role="Python test generator",
        goal="Propose useful tests for observable behavior in the supplied code",
        backstory="You write focused unittest tests and avoid invented APIs.",
        llm=llm,
        allow_delegation=False,
    )

    numbered_code = "\n".join(
        f"{number}: {line}"
        for number, line in enumerate(code.splitlines(), start=1)
    )
    task = Task(
        description=(
            f"File: {source}\n"
            "Propose at most two Python unittest tests for this file. "
            "Return only JSON in this shape: "
            '{"tests":[{"line":1,"name":"test_example",'
            '"test_code":"def test_example(...): ..."}]}. '
            "The line must identify the source behavior being tested. "
            "Use an empty tests list if you cannot propose a meaningful test. "
            "Do not claim the generated tests have been run.\n\n"
            f"{numbered_code}"
        ),
        expected_output="A JSON object containing a tests list.",
        agent=agent,
    )
    raw = Crew(
        agents=[agent],
        tasks=[task],
        process=Process.sequential,
        verbose=False,
    ).kickoff().raw.strip()

    if raw.startswith("```"):
        raw = raw.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
    data = json.loads(raw)
    plan = TestPlanSchema(tests=[])
    if not isinstance(data, dict) or not isinstance(data.get("tests"), list):
        raise ValueError("Test agent did not return a tests list")

    lines = code.splitlines()
    for item in data["tests"][:2]:
        try:
            suggestion = TestSuggestionSchema.model_validate(item)
        except (ValidationError, TypeError):
            continue
        if suggestion.line <= len(lines):
            plan.tests.append(suggestion)

    return [
        {"source": source, **suggestion.model_dump()}
        for suggestion in plan.tests
    ]