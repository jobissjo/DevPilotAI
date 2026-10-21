import { useEffect, useMemo, useState } from "react";
import type { ApiClient } from "../lib/api";
import type {
  AnalysisJob,
  JobStatus,
  Repository,
  User,
  UserUpdate,
} from "../lib/types";
import { useWorkspace } from "../lib/use-workspace";
import { ConfirmDialog, JobDetails, JobForm, RepositoryForm, RepositoryQuestion } from "./forms";
import { Icon } from "./icon";
import type { IconName } from "./icon";
import { Settings } from "./settings";
import { EmptyState, Logo, StatusBadge, relativeTime } from "./ui";

type View = "overview" | "repositories" | "analyses" | "settings";
type Dialog =
  | { type: "repository"; repository?: Repository }
  | { type: "job"; repoId?: number }
  | { type: "details"; jobId: string }
  | { type: "question"; repoId: number }
  | { type: "delete-repo"; repository: Repository }
  | { type: "delete-job"; job: AnalysisJob }
  | { type: "delete-account" };

const navigation: { id: View; title: string; icon: IconName }[] = [
  { id: "overview", title: "Overview", icon: "grid" },
  { id: "repositories", title: "Repositories", icon: "repo" },
  { id: "analyses", title: "Analyses", icon: "spark" },
];

export function Workspace({
  api,
  user,
  demo,
  onSignOut,
  onUpdateUser,
}: {
  api: ApiClient;
  user: User;
  demo: boolean;
  onSignOut: () => void;
  onUpdateUser: (user: User) => void;
}) {
  const data = useWorkspace(api, demo);
  const [view, setView] = useState<View>("overview");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<JobStatus | "all">("all");
  const [repoFilter, setRepoFilter] = useState<number | "all">("all");
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [toast, setToast] = useState("");
  const { repositories, jobs, loading, error } = data;
  const sortedJobs = useMemo(
    () => [...jobs].sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [jobs],
  );
  const completed = jobs.filter((job) => job.status === "completed").length;
  const pending = jobs.filter(
    (job) => job.status === "running" || job.status === "queued",
  ).length;
  const filteredRepos = repositories.filter((repo) =>
    repo.full_name.toLowerCase().includes(query.toLowerCase()),
  );
  const filteredJobs = sortedJobs.filter((job) => {
    const repo = repositories.find((item) => item.id === job.repository_id);
    return (
      (statusFilter === "all" || statusFilter === job.status) &&
      (repoFilter === "all" || job.repository_id === repoFilter) &&
      `${repo?.full_name} ${job.id}`
        .toLowerCase()
        .includes(query.toLowerCase())
    );
  });
  const selectedJob =
    dialog?.type === "details"
      ? jobs.find((job) => job.id === dialog.jobId)
      : undefined;
  const questionRepository = dialog?.type === "question"
    ? repositories.find((repo) => repo.id === dialog.repoId)
    : undefined;
  const questionJob = questionRepository
    ? sortedJobs.find((job) => job.repository_id === questionRepository.id && job.status === "completed")
    : undefined;

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(""), 4500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  function navigate(next: View) {
    setView(next);
    setQuery("");
    setStatusFilter("all");
    setRepoFilter("all");
    setMobileMenu(false);
  }

  function queue(repoId?: number) {
    if (!repositories.length) {
      setDialog({ type: "repository" });
      return;
    }
    setDialog({ type: "job", repoId });
  }

  async function saveUser(values: UserUpdate) {
    const updated = demo
      ? {
          ...user,
          full_name: values.full_name ?? user.full_name,
          email: values.email ?? user.email,
        }
      : await api.updateUser(values);
    onUpdateUser(updated);
    setToast("Profile updated successfully.");
  }

  const firstName = user.full_name.trim().split(/\s+/)[0];
  const initials = user.full_name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="app-layout">
      {mobileMenu && (
        <button
          className="sidebar-backdrop"
          aria-label="Close navigation"
          onClick={() => setMobileMenu(false)}
        />
      )}
      <aside className={`sidebar ${mobileMenu ? "sidebar-open" : ""}`}>
        <div className="sidebar-brand">
          <Logo />
          <button
            className="icon-button mobile-only"
            aria-label="Close navigation"
            onClick={() => setMobileMenu(false)}
          >
            <Icon name="close" />
          </button>
        </div>
        <div className="workspace-select">
          <span className="workspace-avatar">{initials || "DP"}</span>
          <div>
            <strong>{demo ? "Demo workspace" : "Personal workspace"}</strong>
            <span>Developer workspace</span>
          </div>
          <span className="workspace-tag">{demo ? "DEMO" : "V1"}</span>
        </div>
        <div className="nav-label">WORKSPACE</div>
        <nav aria-label="Main navigation">
          {navigation.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${view === item.id ? "active" : ""}`}
              aria-current={view === item.id ? "page" : undefined}
              onClick={() => navigate(item.id)}
            >
              <Icon name={item.icon} />
              <span>{item.title}</span>
              {item.id === "repositories" && (
                <span className="nav-count">{repositories.length}</span>
              )}
              {item.id === "analyses" && pending > 0 && (
                <span className="nav-count">{pending}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-tip">
            <span className="tip-icon">
              <Icon name="spark" size={17} />
            </span>
            <strong>A second set of eyes.</strong>
            <p>Turn your next code review into your next improvement.</p>
            <button className="text-button" onClick={() => queue()}>
              Queue an analysis
              <Icon name="arrow" size={14} />
            </button>
          </div>
          <button
            className={`nav-item ${view === "settings" ? "active" : ""}`}
            aria-current={view === "settings" ? "page" : undefined}
            onClick={() => navigate("settings")}
          >
            <Icon name="settings" />
            <span>Settings</span>
          </button>
          <div className="sidebar-user">
            <span className="user-avatar">{initials || "DP"}</span>
            <div>
              <strong>{user.full_name}</strong>
              <span>{user.email}</span>
            </div>
            <button
              className="icon-button"
              title={demo ? "Leave demo" : "Sign out"}
              aria-label={demo ? "Leave demo" : "Sign out"}
              onClick={onSignOut}
            >
              <Icon name="logout" size={17} />
            </button>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-only"
              aria-label="Open navigation"
              onClick={() => setMobileMenu(true)}
            >
              <Icon name="menu" />
            </button>
            <span>Workspace</span>
            <Icon name="chevron" size={13} />
            <strong>{view.charAt(0).toUpperCase() + view.slice(1)}</strong>
          </div>
          <div className="topbar-right">
            <span className="environment-label">
              <span className={demo ? "demo-dot" : "live-dot"} />
              {demo ? "Demo mode" : "API connected"}
            </span>
            <span className="topbar-divider" />
            <span className="user-avatar small">{initials || "DP"}</span>
          </div>
        </header>
        <main id="main-content" className="main-content">
          {demo && (
            <div className="demo-banner">
              <span>
                <Icon name="spark" size={16} /> You’re exploring a demo. All
                data and changes stay in this session.
              </span>
              <button className="text-button" onClick={onSignOut}>
                Use your account
                <Icon name="arrow" size={14} />
              </button>
            </div>
          )}
          <div className="page-heading">
            <div>
              <div className="eyebrow">YOUR DEVELOPMENT COMMAND CENTER</div>
              <h1>
                {view === "overview"
                  ? `Let’s build something, ${firstName}.`
                  : view === "repositories"
                    ? "Your repositories."
                    : view === "analyses"
                      ? "Every review. One place."
                      : "Make yourself at home."}
              </h1>
              <p>
                {view === "overview"
                  ? "A little more clarity. A lot more confidence in your code."
                  : view === "repositories"
                    ? "Connect your code and give every project a fresh perspective."
                    : view === "analyses"
                      ? "Track analysis jobs and explore the findings that matter."
                      : "Manage your profile and workspace preferences."}
              </p>
            </div>
            {view !== "settings" && (
              <button
                className="button primary"
                onClick={() =>
                  view === "repositories"
                    ? setDialog({ type: "repository" })
                    : queue()
                }
              >
                <Icon
                  name={view === "repositories" ? "plus" : "spark"}
                  size={17}
                />
                {view === "repositories"
                  ? "Connect repository"
                  : "New analysis"}
              </button>
            )}
          </div>
          {error && (
            <div className="workspace-error" role="alert">
              <Icon name="alert" />
              <span>{error}</span>
              <button
                className="button secondary small-button"
                onClick={() => void data.refresh()}
              >
                Try again
              </button>
            </div>
          )}
          {loading && !repositories.length && !error ? (
            <div className="loading-workspace" role="status">
              <span className="loader" />
              Gathering your workspace…
            </div>
          ) : (
            <>
              {view === "overview" && (
                <>
                  <section className="overview-hero">
                    <div className="hero-copy">
                      <span className="hero-label">
                        <Icon name="spark" size={14} /> CODE WITH A LITTLE MORE
                        PERSPECTIVE
                      </span>
                      <h2>
                        Your next improvement
                        <br />
                        is already in your code.
                      </h2>
                      <p>
                        Bring your repositories together. Keep an eye on
                        reviews.
                        <br className="desktop-break" /> Give your best ideas a
                        stronger foundation.
                      </p>
                      <button
                        className="button hero-button"
                        onClick={() => setDialog({ type: "repository" })}
                      >
                        Connect a repository
                        <Icon name="arrow" size={16} />
                      </button>
                    </div>
                    <div className="hero-visual" aria-hidden="true">
                      <div className="orbit orbit-one" />
                      <div className="orbit orbit-two" />
                      <div className="orbit orbit-three" />
                      <span className="orbit-node node-one">
                        <Icon name="branch" size={20} />
                      </span>
                      <span className="orbit-node node-two">
                        <Icon name="shield" size={19} />
                      </span>
                      <span className="orbit-node node-three">
                        <Icon name="code" size={20} />
                      </span>
                      <div className="hero-core">
                        <Icon name="spark" size={43} />
                      </div>
                      <div className="hero-visual-caption">
                        <span className="live-dot" /> A fresh perspective,
                        connected.
                      </div>
                    </div>
                  </section>
                  <section
                    className="stats-grid"
                    aria-label="Workspace statistics"
                  >
                    <Stat
                      icon="repo"
                      label="Connected repositories"
                      value={repositories.length}
                      foot="Your code, brought together"
                    />
                    <Stat
                      icon="spark"
                      label="Total analyses"
                      value={jobs.length}
                      foot="Every review, accounted for"
                    />
                    <Stat
                      icon="check"
                      label="Completed reviews"
                      value={completed}
                      foot="Ready for a closer look"
                      accent="green"
                    />
                    <Stat
                      icon="clock"
                      label="In the pipeline"
                      value={pending}
                      foot="Queued or currently running"
                      accent="amber"
                    />
                  </section>
                  <div className="overview-columns">
                    <section className="panel recent-panel">
                      <div className="section-heading">
                        <div>
                          <h2>
                            Recent analyses{" "}
                            <span className="count-badge">{jobs.length}</span>
                          </h2>
                          <p>A pulse on your latest code reviews.</p>
                        </div>
                        <button
                          className="text-button muted-button"
                          onClick={() => navigate("analyses")}
                        >
                          View all
                          <Icon name="arrow" size={15} />
                        </button>
                      </div>
                      <JobTable
                        jobs={sortedJobs.slice(0, 5)}
                        repositories={repositories}
                        onSelect={(job) =>
                          setDialog({ type: "details", jobId: job.id })
                        }
                        onCreate={() => queue()}
                      />
                    </section>
                    <section className="panel repo-summary">
                      <div className="section-heading">
                        <div>
                          <h2>Repositories</h2>
                          <p>Where good work happens.</p>
                        </div>
                        <button
                          className="icon-button"
                          aria-label="Connect repository"
                          onClick={() => setDialog({ type: "repository" })}
                        >
                          <Icon name="plus" />
                        </button>
                      </div>
                      {repositories.length ? (
                        <div className="mini-repo-list">
                          {repositories.slice(0, 4).map((repo, index) => (
                            <button
                              key={repo.id}
                              className="mini-repo"
                              onClick={() => {
                                navigate("analyses");
                                setRepoFilter(repo.id);
                              }}
                            >
                              <span
                                className={`repo-avatar repo-color-${index % 3}`}
                              >
                                <Icon name="repo" size={19} />
                              </span>
                              <span>
                                <strong>
                                  {repo.full_name.split("/").pop()}
                                </strong>
                                <small>
                                  {repo.full_name.split("/")[0]} <span>·</span>{" "}
                                  {
                                    jobs.filter(
                                      (job) => job.repository_id === repo.id,
                                    ).length
                                  }{" "}
                                  analyses
                                </small>
                              </span>
                              <Icon name="chevron" size={15} />
                            </button>
                          ))}
                        </div>
                      ) : (
                        <EmptyState
                          title="Room for your code"
                          description="Connect your first repository to get started."
                        />
                      )}
                      <button
                        className="repo-summary-footer"
                        onClick={() => navigate("repositories")}
                      >
                        Manage repositories
                        <Icon name="arrow" size={15} />
                      </button>
                    </section>
                  </div>
                  <div className="worker-note">
                    <Icon name="code" size={18} />
                    <span>
                      <strong>A foundation to build on.</strong> Jobs are stored
                      in your workspace. Automated reviews will be available
                      once analysis workers are connected.
                    </span>
                    <span className="outline-badge">BACKEND V1</span>
                  </div>
                </>
              )}
              {view === "repositories" && (
                <section>
                  <div className="list-toolbar">
                    <div className="list-title">
                      All repositories{" "}
                      <span className="count-badge">{repositories.length}</span>
                    </div>
                    <Search
                      value={query}
                      onChange={setQuery}
                      placeholder="Find a repository…"
                    />
                    <button
                      className={`icon-button ${loading ? "spin" : ""}`}
                      disabled={loading}
                      aria-label="Refresh repositories"
                      onClick={() => void data.refresh()}
                    >
                      <Icon name="refresh" />
                    </button>
                  </div>
                  {filteredRepos.length ? (
                    <div className="repository-grid">
                      {filteredRepos.map((repo, index) => (
                        <RepositoryCard
                          key={repo.id}
                          repository={repo}
                          jobs={sortedJobs.filter(
                            (job) => job.repository_id === repo.id,
                          )}
                          index={index}
                          onAnalyze={() => queue(repo.id)}
                          onAsk={!demo && sortedJobs.some(
                            (job) => job.repository_id === repo.id && job.status === "completed",
                          ) ? () => setDialog({ type: "question", repoId: repo.id }) : undefined}
                          onEdit={() =>
                            setDialog({ type: "repository", repository: repo })
                          }
                          onDelete={() =>
                            setDialog({ type: "delete-repo", repository: repo })
                          }
                          onView={() => {
                            navigate("analyses");
                            setRepoFilter(repo.id);
                          }}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="panel">
                      <EmptyState
                        title={
                          query
                            ? "No repositories match"
                            : "Your code belongs here."
                        }
                        description={
                          query
                            ? "Try another repository name."
                            : "Connect your first GitHub repository to start building your review history."
                        }
                        action={
                          !query && (
                            <button
                              className="button primary"
                              onClick={() => setDialog({ type: "repository" })}
                            >
                              <Icon name="plus" size={16} />
                              Connect repository
                            </button>
                          )
                        }
                      />
                    </div>
                  )}
                </section>
              )}
              {view === "analyses" && (
                <section className="panel analyses-panel">
                  <div className="list-toolbar">
                    <div className="list-title">
                      Analysis history{" "}
                      <span className="count-badge">{jobs.length}</span>
                    </div>
                    <Search
                      value={query}
                      onChange={setQuery}
                      placeholder="Search reviews…"
                    />
                    <button
                      className={`icon-button ${loading ? "spin" : ""}`}
                      disabled={loading}
                      aria-label="Refresh analyses"
                      onClick={() => void data.refresh()}
                    >
                      <Icon name="refresh" />
                    </button>
                  </div>
                  <div className="analysis-filters">
                    <div className="filter-tabs" aria-label="Filter by status">
                      {(
                        [
                          "all",
                          "completed",
                          "running",
                          "queued",
                          "failed",
                        ] as const
                      ).map((status) => (
                        <button
                          key={status}
                          aria-pressed={statusFilter === status}
                          className={statusFilter === status ? "selected" : ""}
                          onClick={() => setStatusFilter(status)}
                        >
                          {status === "all"
                            ? "All reviews"
                            : status.charAt(0).toUpperCase() + status.slice(1)}
                        </button>
                      ))}
                    </div>
                    <select
                      aria-label="Filter by repository"
                      className="compact-select"
                      value={repoFilter}
                      onChange={(event) =>
                        setRepoFilter(
                          event.target.value === "all"
                            ? "all"
                            : Number(event.target.value),
                        )
                      }
                    >
                      <option value="all">All repositories</option>
                      {repositories.map((repo) => (
                        <option key={repo.id} value={repo.id}>
                          {repo.full_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <JobTable
                    jobs={filteredJobs}
                    repositories={repositories}
                    onSelect={(job) =>
                      setDialog({ type: "details", jobId: job.id })
                    }
                    onCreate={() => queue()}
                    filtered={
                      !!query || statusFilter !== "all" || repoFilter !== "all"
                    }
                  />
                </section>
              )}
              {view === "settings" && (
                <Settings
                  user={user}
                  demo={demo}
                  onSave={saveUser}
                  onDelete={() => setDialog({ type: "delete-account" })}
                />
              )}
            </>
          )}
          <footer className="workspace-footer">
            <span>
              <Logo compact /> A clearer way to build.
            </span>
            <span>
              DevPilot AI <span> / </span> Your code, in perspective.
            </span>
          </footer>
        </main>
      </div>
      {dialog?.type === "repository" && (
        <RepositoryForm
          repository={dialog.repository}
          onClose={() => setDialog(null)}
          onSave={async (values, id) => {
            await data.saveRepository(values, id);
            setToast(
              id
                ? "Repository updated."
                : "Repository connected. You’re ready to queue a review.",
            );
          }}
        />
      )}
      {dialog?.type === "job" && (
        <JobForm
          repositories={repositories}
          defaultRepo={dialog.repoId}
          onClose={() => setDialog(null)}
          onSave={async (repoId) => {
            await data.createJob(repoId);
            setToast(
              "Analysis job queued. It will wait for an available worker.",
            );
            navigate("analyses");
          }}
        />
      )}
      {selectedJob && (
        <JobDetails
          job={selectedJob}
          repository={repositories.find(
            (repo) => repo.id === selectedJob.repository_id,
          )}
          onClose={() => setDialog(null)}
          onDelete={() => setDialog({ type: "delete-job", job: selectedJob })}
        />
      )}
      {questionRepository && questionJob && (
        <RepositoryQuestion
          repository={questionRepository}
          onAsk={(question) => api.askJob(questionJob.id, question)}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.type === "delete-repo" && (
        <ConfirmDialog
          title="Disconnect repository?"
          description={`This permanently deletes ${dialog.repository.full_name} and all of its analysis jobs from your workspace. Your code on GitHub is not affected.`}
          label="Disconnect repository"
          onClose={() => setDialog(null)}
          onConfirm={async () => {
            await data.deleteRepository(dialog.repository.id);
            setToast("Repository disconnected.");
          }}
        />
      )}
      {dialog?.type === "delete-job" && (
        <ConfirmDialog
          title="Delete this analysis?"
          description="This permanently removes the analysis job and its findings from your workspace."
          label="Delete analysis"
          onClose={() => setDialog(null)}
          onConfirm={async () => {
            await data.deleteJob(dialog.job.id);
            setToast("Analysis deleted.");
          }}
        />
      )}
      {dialog?.type === "delete-account" && (
        <ConfirmDialog
          title={demo ? "Leave the demo?" : "Delete your account?"}
          description={
            demo
              ? "This ends your demo session. You can sign in or start a fresh demo at any time."
              : "Your account, repositories, analysis jobs, and findings will be permanently deleted. This cannot be undone."
          }
          label={demo ? "Leave demo" : "Delete my account"}
          onClose={() => setDialog(null)}
          onConfirm={async () => {
            if (!demo) await api.deleteUser();
            onSignOut();
          }}
        />
      )}
      {toast && (
        <div className="toast" role="status">
          <span>
            <Icon name="check" size={17} />
          </span>
          {toast}
          <button
            className="icon-button"
            aria-label="Dismiss notification"
            onClick={() => setToast("")}
          >
            <Icon name="close" size={15} />
          </button>
        </div>
      )}
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  foot,
  accent = "purple",
}: {
  icon: IconName;
  label: string;
  value: number;
  foot: string;
  accent?: string;
}) {
  return (
    <div className="stat-card">
      <div className="stat-label">
        {label}
        <span className={`stat-icon ${accent}`}>
          <Icon name={icon} size={17} />
        </span>
      </div>
      <div className="stat-value">{value.toString().padStart(2, "0")}</div>
      <div className="stat-foot">{foot}</div>
    </div>
  );
}

function Search({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="search-input">
      <Icon name="search" size={16} />
      <input
        type="search"
        aria-label={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}

function JobTable({
  jobs,
  repositories,
  onSelect,
  onCreate,
  filtered = false,
}: {
  jobs: AnalysisJob[];
  repositories: Repository[];
  onSelect: (job: AnalysisJob) => void;
  onCreate: () => void;
  filtered?: boolean;
}) {
  if (!jobs.length)
    return (
      <EmptyState
        title={
          filtered ? "No matching reviews" : "Your next fresh perspective."
        }
        description={
          filtered
            ? "Try a different search or filter."
            : "Queue your first analysis to start a review history."
        }
        action={
          !filtered && (
            <button className="button secondary" onClick={onCreate}>
              <Icon name="spark" size={15} />
              Queue an analysis
            </button>
          )
        }
      />
    );
  return (
    <div className="table-scroll">
      <table className="job-table">
        <thead>
          <tr>
            <th>REPOSITORY</th>
            <th>STATUS</th>
            <th>SCOPE</th>
            <th>CREATED</th>
            <th>
              <span className="sr-only">View details</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => (
            <tr key={job.id}>
              <td>
                <button
                  className="table-repo-button"
                  onClick={() => onSelect(job)}
                >
                  <Icon name="repo" size={17} />
                  <span>
                    <strong>
                      {repositories
                        .find((repo) => repo.id === job.repository_id)
                        ?.full_name.split("/")
                        .pop() || "Repository"}
                    </strong>
                    <small>#{job.id.slice(0, 8)}</small>
                  </span>
                </button>
              </td>
              <td>
                <StatusBadge status={job.status} />
              </td>
              <td>
                <span className="commit">Full repository</span>
              </td>
              <td>
                <time
                  className="table-time"
                  dateTime={job.created_at}
                  title={new Date(job.created_at).toLocaleString()}
                >
                  {relativeTime(job.created_at)}
                </time>
              </td>
              <td>
                <button
                  className="icon-button"
                  aria-label={`View analysis ${job.id.slice(0, 8)}`}
                  onClick={() => onSelect(job)}
                >
                  <Icon name="arrow" size={16} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RepositoryCard({
  repository: repo,
  jobs,
  index,
  onAnalyze,
  onAsk,
  onEdit,
  onDelete,
  onView,
}: {
  repository: Repository;
  jobs: AnalysisJob[];
  index: number;
  onAnalyze: () => void;
  onAsk?: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onView: () => void;
}) {
  const latest = jobs[0];
  return (
    <article className="panel repository-card">
      <div className="repo-card-top">
        <span className={`repo-avatar repo-color-${index % 3}`}>
          <Icon name="repo" size={22} />
        </span>
        <div className="repo-card-actions">
          <button
            className="icon-button"
            aria-label={`Edit ${repo.full_name}`}
            onClick={onEdit}
          >
            <Icon name="edit" size={16} />
          </button>
          <button
            className="icon-button danger-hover"
            aria-label={`Disconnect ${repo.full_name}`}
            onClick={onDelete}
          >
            <Icon name="trash" size={16} />
          </button>
        </div>
      </div>
      <div className="repo-owner">{repo.full_name.split("/")[0]} /</div>
      <h2>
        <button className="repo-title-button" onClick={onView}>
          {repo.full_name.split("/").slice(1).join("/")}
        </button>
      </h2>
      <a
        className="repo-link"
        href={repo.clone_url}
        target="_blank"
        rel="noreferrer"
      >
        <Icon name="github" size={14} />
        View on GitHub
        <Icon name="external" size={12} />
      </a>
      <div className="repo-card-meta">
        <span>
          <Icon name="spark" size={14} />
          {jobs.length} {jobs.length === 1 ? "analysis" : "analyses"}
        </span>
        {latest ? (
          <StatusBadge status={latest.status} />
        ) : (
          <span className="subtle-label">Ready for review</span>
        )}
      </div>
      <div className="repo-card-footer">
        <span>
          {latest
            ? `Last review ${relativeTime(latest.created_at)}`
            : `Added ${relativeTime(repo.created_at)}`}
        </span>
        <div className="repo-card-actions-bottom">
          <button
            className="text-button"
            onClick={onAsk}
            disabled={!onAsk}
            title={onAsk ? "Ask about this repository" : "Complete an analysis to ask questions"}
          >
            Ask code
          </button>
          <button className="text-button" onClick={onAnalyze}>
            Analyze
            <Icon name="arrow" size={14} />
          </button>
        </div>
      </div>
    </article>
  );
}
