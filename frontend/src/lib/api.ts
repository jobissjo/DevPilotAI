import type {
  AnalysisJob,
  Repository,
  RepositoryInput,
  User,
  UserUpdate,
} from "./types";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "/api").replace(
  /\/$/,
  "",
);

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function errorDetail(body: unknown): string {
  if (typeof body !== "object" || body === null || !("detail" in body))
    return "Something went wrong. Please try again.";
  const detail = body.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map(
        (item: { loc?: (string | number)[]; msg?: string }) =>
          `${item.loc?.filter((part) => part !== "body").join(" · ") || "Request"}: ${item.msg || "Invalid value"}`,
      )
      .join(". ");
  }
  return "Something went wrong. Please try again.";
}

export class ApiClient {
  constructor(
    private token?: string,
    private onUnauthorized?: () => void,
  ) {}

  private async request<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    const headers = new Headers(options.headers);
    if (this.token) headers.set("Authorization", `Bearer ${this.token}`);
    if (options.body && !(options.body instanceof URLSearchParams))
      headers.set("Content-Type", "application/json");
    let response: Response;
    try {
      response = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers,
        signal: AbortSignal.timeout(15000),
      });
    } catch {
      throw new ApiError(
        "Cannot reach DevPilot. Check that the backend is running and try again.",
        0,
      );
    }
    if (!response.ok) {
      if (response.status === 401 && this.token) this.onUnauthorized?.();
      const body: unknown = await response.json().catch(() => null);
      throw new ApiError(errorDetail(body), response.status);
    }
    if (response.status === 204) return undefined as T;
    return response.json() as Promise<T>;
  }

  private async all<T>(path: string): Promise<T[]> {
    const result: T[] = [];
    for (let offset = 0; ; offset += 100) {
      const page = await this.request<T[]>(
        `${path}?offset=${offset}&limit=100`,
      );
      result.push(...page);
      if (page.length < 100) return result;
    }
  }

  register(data: { full_name: string; email: string; password: string }) {
    return this.request<User>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  login(email: string, password: string) {
    return this.request<{ access_token: string; token_type: string }>(
      "/auth/token",
      {
        method: "POST",
        body: new URLSearchParams({ username: email, password }),
      },
    );
  }

  me() {
    return this.request<User>("/users/me");
  }
  updateUser(data: UserUpdate) {
    return this.request<User>("/users/me", {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }
  deleteUser() {
    return this.request<void>("/users/me", { method: "DELETE" });
  }
  repositories() {
    return this.all<Repository>("/repositories");
  }
  createRepository(data: RepositoryInput) {
    return this.request<Repository>("/repositories", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }
  updateRepository(id: number, data: RepositoryInput) {
    return this.request<Repository>(`/repositories/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }
  deleteRepository(id: number) {
    return this.request<void>(`/repositories/${id}`, { method: "DELETE" });
  }
  jobs(repoId: number) {
    return this.all<AnalysisJob>(`/repositories/${repoId}/jobs`);
  }
  createJob(repoId: number, commitSha?: string) {
    return this.request<AnalysisJob>(`/repositories/${repoId}/jobs`, {
      method: "POST",
      body: JSON.stringify({ commit_sha: commitSha || null }),
    });
  }
  deleteJob(id: string) {
    return this.request<void>(`/jobs/${id}`, { method: "DELETE" });
  }
}
