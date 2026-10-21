# Project Roadmap & Implementation Tracker

## Phase 1 — Backend Foundation
- [x] Create FastAPI application with uv
- [x] Implement user authentication and GitHub repository connection
- [x] Store repositories and analysis jobs in PostgreSQL

## Phase 2 — LangChain RAG
- [x] Fetch and parse repository code
- [x] Implement chunking, embeddings, and chromadb search
- [x] Build repository Q&A with source file references

## Phase 3 — CrewAI Agents
- [x] Create code quality and security reviewer agents
- [] Create test generation and documentation agents
- [] Return structured findings with file references

## Phase 4 — LangGraph Workflow
- [ ] Build stateful analysis workflow
- [ ] Add checkpointing, conditional routing, and approval
- [ ] Implement safe failure recovery and job status tracking

## Phase 5 — Production Readiness
- [ ] Add Celery workers and Redis
- [ ] Create React dashboard with findings and diff review
- [ ] Add unit tests, integration tests, CI/CD, and Docker deployment