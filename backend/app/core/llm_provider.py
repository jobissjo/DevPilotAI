from app.core.config import settings


def selected_llm() -> tuple[str, str, str]:
    """Return the configured provider, model, and key for generation."""
    if settings.LLM_PROVIDER == "openrouter":
        if not settings.OPENROUTER_API_KEY:
            raise ValueError("Set OPENROUTER_API_KEY to use OpenRouter")
        return "openrouter", settings.OPENROUTER_MODEL, settings.OPENROUTER_API_KEY

    if not settings.GROQ_API_KEY:
        raise ValueError("Set GROQ_API_KEY to use Groq")
    return "groq", settings.GROQ_MODEL, settings.GROQ_API_KEY
