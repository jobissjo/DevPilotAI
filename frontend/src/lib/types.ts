export interface User {
  id: number;
  full_name: string;
  email: string;
}

export interface Repository {
  id: number;
  user_id: number;
  github_repo_id: number;
  full_name: string;
  clone_url: string;
  created_at: string;
}

export type JobStatus = "queued" | "running" | "completed" | "failed";

export interface AnalysisJob {
  id: string;
  repository_id: number;
  status: JobStatus;
  commit_sha: string | null;
  findings_summary: Record<string, unknown> | null;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

export type RepositoryInput = Pick<
  Repository,
  "full_name" | "clone_url"
>;
export type UserUpdate = Partial<Pick<User, "full_name" | "email">> & {
  password?: string;
};
