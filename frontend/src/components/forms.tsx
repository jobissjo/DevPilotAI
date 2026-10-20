import { useState } from "react";
import type { FormEvent } from "react";
import type { AnalysisJob, QuestionAnswer, Repository, RepositoryInput } from "../lib/types";
import { Icon } from "./icon";
import { ErrorMessage, Modal, StatusBadge, errorMessage } from "./ui";

export function RepositoryForm({
  repository,
  onSave,
  onClose,
}: {
  repository?: Repository;
  onSave: (data: RepositoryInput, id?: number) => Promise<void>;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const fullName = String(fields.get("full_name")).trim();
    if (!/^[^/\s]+\/[^/\s]+$/.test(fullName)) {
      setError("Use the owner/repository format, for example acme/platform.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await onSave(
        {
          full_name: fullName,
          clone_url: String(fields.get("clone_url")).trim(),
        },
        repository?.id,
      );
      onClose();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={repository ? "Edit repository" : "Connect a repository"}
      description="Add a GitHub repository to your workspace. You can queue analysis jobs once it’s connected."
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form className="stack-form" onSubmit={submit}>
        <label>
          Repository name
          <input
            autoFocus
            name="full_name"
            placeholder="acme/platform-web"
            defaultValue={repository?.full_name}
            required
          />
        </label>
        <label>
          Clone URL
          <input
            name="clone_url"
            type="url"
            pattern="https?://.*"
            required
            placeholder="https://github.com/acme/platform-web.git"
            defaultValue={repository?.clone_url}
          />
        </label>
        <div className="subtle-note">
          <Icon name="shield" size={16} /> Repository details are saved to your
          account. GitHub OAuth isn’t connected yet.
        </div>
        {error && <ErrorMessage>{error}</ErrorMessage>}
        <div className="modal-actions">
          <button
            type="button"
            className="button secondary"
            disabled={busy}
            onClick={onClose}
          >
            Cancel
          </button>
          <button className="button primary" disabled={busy}>
            {busy
              ? "Saving…"
              : repository
                ? "Save changes"
                : "Connect repository"}
            <Icon name="arrow" size={16} />
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function JobForm({
  repositories,
  defaultRepo,
  onSave,
  onClose,
}: {
  repositories: Repository[];
  defaultRepo?: number;
  onSave: (repoId: number) => Promise<void>;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      await onSave(Number(data.get("repository")));
      onClose();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title="Queue an analysis"
      description="Choose the repository to analyze in full."
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form className="stack-form" onSubmit={submit}>
        <label>
          Repository
          <select
            name="repository"
            defaultValue={defaultRepo ?? repositories[0]?.id}
            required
          >
            {repositories.map((repo) => (
              <option value={repo.id} key={repo.id}>
                {repo.full_name}
              </option>
            ))}
          </select>
        </label>
        <div className="info-banner">
          <Icon name="clock" size={18} />
          <span>
            This creates a queued job. Automated analysis will run when a worker
            is connected to the backend.
          </span>
        </div>
        {error && <ErrorMessage>{error}</ErrorMessage>}
        <div className="modal-actions">
          <button
            type="button"
            className="button secondary"
            disabled={busy}
            onClick={onClose}
          >
            Cancel
          </button>
          <button className="button primary" disabled={busy}>
            {busy ? "Creating…" : "Queue analysis"}
            <Icon name="spark" size={16} />
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function ConfirmDialog({
  title,
  description,
  label,
  onConfirm,
  onClose,
}: {
  title: string;
  description: string;
  label: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function confirm() {
    setBusy(true);
    setError("");
    try {
      await onConfirm();
      onClose();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={title}
      description={description}
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      {error && <ErrorMessage>{error}</ErrorMessage>}
      <div className="modal-actions">
        <button className="button secondary" disabled={busy} onClick={onClose}>
          Cancel
        </button>
        <button
          className="button danger"
          disabled={busy}
          onClick={() => void confirm()}
        >
          {busy ? "Deleting…" : label}
        </button>
      </div>
    </Modal>
  );
}

function Findings({ value, depth = 0 }: { value: unknown; depth?: number }) {
  if (value === null || value === undefined)
    return <span className="muted">None</span>;
  if (typeof value !== "object") return <span>{String(value)}</span>;
  if (depth > 6)
    return <pre className="json-block">{JSON.stringify(value, null, 2)}</pre>;
  if (Array.isArray(value))
    return value.length ? (
      <div className="findings-list">
        {value.map((item, index) => (
          <div className="finding-card" key={index}>
            <Findings value={item} depth={depth + 1} />
          </div>
        ))}
      </div>
    ) : (
      <p className="muted">No findings reported.</p>
    );
  return (
    <dl className="finding-fields">
      {Object.entries(value).map(([key, content]) => (
        <div key={key}>
          <dt>{key.replaceAll("_", " ")}</dt>
          <dd>
            <Findings value={content} depth={depth + 1} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function JobDetails({
  job,
  repository,
  onAsk,
  onClose,
  onDelete,
}: {
  job: AnalysisJob;
  repository?: Repository;
  onAsk?: (question: string) => Promise<QuestionAnswer>;
  onClose: () => void;
  onDelete: () => void;
}) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<QuestionAnswer | null>(null);
  const [asking, setAsking] = useState(false);
  const [askError, setAskError] = useState("");

  async function ask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!onAsk || !question.trim()) return;
    setAsking(true);
    setAskError("");
    setAnswer(null);
    try {
      setAnswer(await onAsk(question.trim()));
    } catch (cause) {
      setAskError(errorMessage(cause));
    } finally {
      setAsking(false);
    }
  }

  return (
    <Modal
      title="Analysis details"
      description={repository?.full_name || "Repository"}
      onClose={onClose}
    >
      <div className="job-detail-meta">
        <StatusBadge status={job.status} />
        <span className="mono">Full repository</span>
      </div>
      <dl className="detail-grid">
        <div>
          <dt>Job ID</dt>
          <dd className="mono">{job.id}</dd>
        </div>
        <div>
          <dt>Created</dt>
          <dd>{new Date(job.created_at).toLocaleString()}</dd>
        </div>
        <div>
          <dt>Completed</dt>
          <dd>
            {job.completed_at
              ? new Date(job.completed_at).toLocaleString()
              : "—"}
          </dd>
        </div>
      </dl>
      {job.error_message && <ErrorMessage>{job.error_message}</ErrorMessage>}
      {job.findings_summary ? (
        <section className="findings">
          <h3>
            <Icon name="spark" size={17} /> Findings
          </h3>
          <Findings value={job.findings_summary} />
        </section>
      ) : (
        !job.error_message && (
          <div className="info-banner">
            <Icon name="clock" />
            <span>
              {job.status === "queued"
                ? "This job is queued. Findings will appear when an analysis worker processes it."
                : job.status === "running"
                  ? "Analysis is in progress. Check back for results."
                  : "No findings were attached to this analysis."}
            </span>
          </div>
        )
      )}
      {job.status === "completed" && onAsk && (
        <section className="qa-panel">
          <h3>Ask about this repository</h3>
          <p className="muted">Answers use code indexed by this analysis.</p>
          <form onSubmit={(event) => void ask(event)}>
            <label htmlFor="repo-question">Your question</label>
            <textarea
              id="repo-question"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Where is user login handled?"
              maxLength={1000}
              required
            />
            <button className="button primary" disabled={asking || !question.trim()}>
              {asking ? "Finding answer…" : "Ask question"}
            </button>
          </form>
          {askError && <ErrorMessage>{askError}</ErrorMessage>}
          {answer && (
            <div className="qa-answer" aria-live="polite">
              <h4>Answer</h4>
              <p>{answer.answer}</p>
              {answer.sources.length > 0 && (
                <>
                  <h4>Source excerpts</h4>
                  <ol>
                    {answer.sources.map((source, index) => (
                      <li key={`${source.source}-${source.start_line}-${index}`}>
                        <span className="mono">[{index + 1}] {source.source}:{source.start_line}–{source.end_line}</span>
                      </li>
                    ))}
                  </ol>
                </>
              )}
            </div>
          )}
        </section>
      )}
      <div className="modal-actions spread">
        <button className="button ghost danger-text" onClick={onDelete}>
          <Icon name="trash" size={15} />
          Delete job
        </button>
        <button className="button secondary" onClick={onClose}>
          Close
        </button>
      </div>
    </Modal>
  );
}
