from collections.abc import Iterator
from pathlib import Path

from langchain_core.documents import Document

SOURCE_SUFFIXES = {".py", ".js", ".jsx", ".ts", ".tsx"}
SKIP_DIRS = {".git", "node_modules", ".venv", "dist", "build"}
MAX_FILE_BYTES = 512_000

def load_source_documents(repo_path: Path) -> Iterator[Document]:
    for path in repo_path.rglob("*"):
        if not path.is_file() or path.is_symlink():
            continue

        relative = path.relative_to(repo_path)

        if any(part in SKIP_DIRS for part in relative.parts):
            continue
        if path.suffix.lower() not in SOURCE_SUFFIXES:
            continue
        if path.stat().st_size > MAX_FILE_BYTES:
            continue

        try:
            content = path.read_text(encoding="utf-8")
        except (UnicodeError, OSError):
            continue

        if not content.strip():
            continue

        yield Document(
            page_content=content,
            metadata={
                "source": relative.as_posix(),
                "start_line": 1,
                "end_line": len(content.splitlines()),
            },
        )