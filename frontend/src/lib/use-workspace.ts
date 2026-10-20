import { useCallback, useEffect, useRef, useState } from "react";
import type { ApiClient } from "./api";
import { demoJobs, demoRepositories } from "./demo";
import type { AnalysisJob, Repository, RepositoryInput } from "./types";

export function useWorkspace(api: ApiClient, demo: boolean) {
  const [repositories, setRepositories] = useState<Repository[]>(
    demo ? demoRepositories : [],
  );
  const [jobs, setJobs] = useState<AnalysisJob[]>(demo ? demoJobs : []);
  const [loading, setLoading] = useState(!demo);
  const [error, setError] = useState("");
  const generation = useRef(0);

  const refresh = useCallback(
    async (quiet = false) => {
      if (demo) return;
      const request = ++generation.current;
      if (!quiet) setLoading(true);
      try {
        const repos = await api.repositories();
        const jobLists = await Promise.all(
          repos.map((repo) => api.jobs(repo.id)),
        );
        if (request !== generation.current) return;
        setRepositories(repos);
        setJobs(
          jobLists
            .flat()
            .sort((a, b) => b.created_at.localeCompare(a.created_at)),
        );
        setError("");
      } catch (cause) {
        if (request === generation.current)
          setError(
            cause instanceof Error
              ? cause.message
              : "Could not load your workspace.",
          );
      } finally {
        if (request === generation.current) setLoading(false);
      }
    },
    [api, demo],
  );

  useEffect(() => {
    void refresh();
    return () => {
      generation.current++;
    };
  }, [refresh]);

  const pending = jobs.some(
    (job) => job.status === "queued" || job.status === "running",
  );
  useEffect(() => {
    if (demo || !pending) return;
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh(true);
    }, 15000);
    return () => window.clearInterval(interval);
  }, [demo, pending, refresh]);

  async function saveRepository(data: RepositoryInput, id?: number) {
    const repo = demo
      ? {
          ...data,
          id: id ?? Date.now(),
          github_repo_id: repositories.find((repo) => repo.id === id)?.github_repo_id ?? Date.now(),
          user_id: 1,
          created_at: new Date().toISOString(),
        }
      : id
        ? await api.updateRepository(id, data)
        : await api.createRepository(data);
    generation.current++;
    setLoading(false);
    setRepositories((current) =>
      id
        ? current.map((item) => (item.id === id ? repo : item))
        : [repo, ...current],
    );
    return repo;
  }

  async function deleteRepository(id: number) {
    if (!demo) await api.deleteRepository(id);
    generation.current++;
    setLoading(false);
    setRepositories((current) => current.filter((item) => item.id !== id));
    setJobs((current) => current.filter((item) => item.repository_id !== id));
  }

  async function createJob(repoId: number, sha: string) {
    const job: AnalysisJob = demo
      ? {
          id: crypto.randomUUID(),
          repository_id: repoId,
          status: "queued",
          commit_sha: sha || null,
          findings_summary: null,
          error_message: null,
          created_at: new Date().toISOString(),
          completed_at: null,
        }
      : await api.createJob(repoId, sha);
    generation.current++;
    setLoading(false);
    setJobs((current) => [job, ...current]);
    return job;
  }

  async function deleteJob(id: string) {
    if (!demo) await api.deleteJob(id);
    generation.current++;
    setLoading(false);
    setJobs((current) => current.filter((item) => item.id !== id));
  }

  return {
    repositories,
    jobs,
    loading,
    error,
    refresh,
    saveRepository,
    deleteRepository,
    createJob,
    deleteJob,
  };
}
