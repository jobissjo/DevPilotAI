import json
from typing import Literal

from app.core.llm_provider import selected_llm
from app.schemas.agent_schemas import FindingSchema, ReviewResultSchema
from crewai import LLM, Agent, Crew, Process, Task
from pydantic import ValidationError


def parse_review_result(raw: str) -> ReviewResultSchema:
    """Validate reviewer JSON without relying on provider tool-call schemas."""
    text = raw.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
    data = json.loads(text)
    if not isinstance(data, dict) or not isinstance(data.get("findings"), list):
        raise ValueError("Reviewer response must contain a findings list")
    findings = []
    for finding in data["findings"]:
        if not isinstance(finding, dict):
            continue
        if isinstance(finding.get("severity"), str):
            finding["severity"] = finding["severity"].strip().lower()
        try:
            findings.append(FindingSchema.model_validate(finding))
        except ValidationError:
            continue
    return ReviewResultSchema(findings=findings)


def run_reviewer(
    category: Literal["quality", "security"],
    source: str,
    code: str,
    llm: LLM,
    context: dict[str, str],
):
    lines = code.splitlines()
    numbered_code = "\n".join(
        f"{number}: {line}" for number, line in enumerate(lines, start=1)
    )
    context_text = "\n\n".join(
        f"Related file: {path}\n{content}" for path, content in context.items()
    )

    agent = Agent(
        role=f"{category.title()} reviewer",
        goal=f"Find concrete {category} problems supported by the source code",
        backstory="You cite exact lines and avoid speculative findings.",
        llm=llm,
        allow_delegation=False,
    )

    task = Task(
        description=(
            f"Review only this file: {source}\n"
            f"Report at most 3 distinct {category} problems. "
            "Use severity exactly as one of: low, medium, high. "
            "Return only a JSON object with a findings array. Each finding must "
            "have line, severity, title, explanation, and evidence. "
            "Use {\"findings\": []} when there are no findings. "
            "An empty findings list is valid. "
            "For each finding, cite its actual line number and copy that "
            "line exactly into evidence. Do not report style preferences "
            "or claims you cannot establish from this code.\n\n"
            f"{numbered_code}"
            f"\n\nRelated files for context only:\n{context_text}\n"
            "Report findings only for the target file. Check related code before "
            "claiming a value is unvalidated or an attacker can control it."
        ),
        expected_output="A JSON object with a findings array; no Markdown or extra text.",
        agent=agent,
    )

    result = Crew(
        agents=[agent],
        tasks=[task],
        process=Process.sequential,
        verbose=False,
    ).kickoff()

    parsed = parse_review_result(result.raw)

    valid = []
    for finding in parsed.findings:
        if finding.line > len(lines):
            continue
        if finding.evidence.strip() != lines[finding.line - 1].strip():
            continue

        valid.append(
            {
                "category": category,
                "source": source,
                **finding.model_dump(),
            }
        )
    return valid


def review_code(
    source: str, code: str, context: dict[str, str] | None = None
) -> dict[str, list[dict]]:
    provider, model, api_key = selected_llm()
    context = context or {}
    options = {
        "reasoning_effort": "low",
        "allowed_openai_params": ["reasoning_effort"],
    } if provider == "groq" else {}
    llm = LLM(
        model=f"{provider}/{model}",
        api_key=api_key,
        temperature=0,
        max_tokens=4096,
        **options,
    )

    return {
        "quality": run_reviewer("quality", source, code, llm, context),
        "security": run_reviewer("security", source, code, llm, context),
    }
