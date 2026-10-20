from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_core.documents import Document



MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
COLLECTION_NAME = "devpilot_code_minilm_v1"

def get_vector_store() -> Chroma:
    embeddings = HuggingFaceEmbeddings(model_name=MODEL_NAME)

    return Chroma(
        collection_name=COLLECTION_NAME,
        embedding_function=embeddings,
        host="127.0.0.1",
        port=8001,
    )


def index_chunks(
    repository_id: int,
    job_id: str,
    chunks: list[Document],
) -> int:
    if not chunks:
        return 0

    store = get_vector_store()

    for start in range(0, len(chunks), 32):
        batch = chunks[start : start + 32]
        for chunk in batch:
            chunk.metadata["repository_id"] = repository_id
            chunk.metadata["job_id"] = job_id

        store.add_documents(
            documents=batch,
            ids=[
                f"{job_id}:{index}"
                for index in range(start, start + len(batch))
            ],
        )

    return len(chunks)