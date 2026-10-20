from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter

splitter = RecursiveCharacterTextSplitter(
    chunk_size=1200,
    chunk_overlap=150,
    add_start_index=True,
    strip_whitespace=False,
)


def chunk_documents(documents: list[Document]) -> list[Document]:
    chunks = []

    for document in documents:
        for chunk in splitter.split_documents([document]):
            start = chunk.metadata["start_index"]
            end = start + len(chunk.page_content)
            content = document.page_content

            chunk.metadata["start_line"] = content.count("\n", 0, start) + 1
            chunk.metadata["end_line"] = (
                content.count("\n", 0, max(start, end - 1)) + 1
            )
            chunks.append(chunk)

    return chunks