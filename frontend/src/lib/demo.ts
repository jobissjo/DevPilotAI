import type { AnalysisJob, Repository, User } from "./types";

export const demoUser: User = {
  id: 1,
  full_name: "Alex Morgan",
  email: "alex@example.com",
};
const now = Date.now();
const ago = (hours: number) => new Date(now - hours * 3600000).toISOString();

export const demoRepositories: Repository[] = [
  {
    id: 1,
    user_id: 1,
    github_repo_id: 81001,
    full_name: "acme/commerce-api",
    clone_url: "https://github.com/acme/commerce-api.git",
    created_at: ago(240),
  },
  {
    id: 2,
    user_id: 1,
    github_repo_id: 81002,
    full_name: "acme/design-system",
    clone_url: "https://github.com/acme/design-system.git",
    created_at: ago(180),
  },
  {
    id: 3,
    user_id: 1,
    github_repo_id: 81003,
    full_name: "acme/platform-web",
    clone_url: "https://github.com/acme/platform-web.git",
    created_at: ago(96),
  },
];

export const demoJobs: AnalysisJob[] = [
  {
    id: "941b2c4a-10ed-4567-b389-a87987ebc101",
    repository_id: 1,
    status: "completed",
    commit_sha: "c7e91a23f1",
    created_at: ago(2),
    completed_at: ago(1.9),
    error_message: null,
    findings_summary: {
      summary:
        "The API has a solid foundation. Two areas deserve a closer look before the next release.",
      findings: [
        {
          title: "Validate incoming pagination limits",
          severity: "medium",
          file: "src/routes/products.ts",
          description:
            "Add an upper bound to the page size to prevent unexpectedly large database queries.",
        },
        {
          title: "Add coverage for expired sessions",
          severity: "low",
          file: "src/auth/session.test.ts",
          description:
            "Include an expired session case alongside the existing authentication tests.",
        },
      ],
    },
  },
  {
    id: "941b2c4a-10ed-4567-b389-a87987ebc102",
    repository_id: 2,
    status: "completed",
    commit_sha: "a12f48b32c",
    created_at: ago(5),
    completed_at: ago(4.9),
    error_message: null,
    findings_summary: {
      summary: "Components are consistent and well structured.",
      findings: [
        {
          title: "Improve keyboard focus visibility",
          severity: "low",
          file: "components/Select.tsx",
          description:
            "Use a visible focus ring on the trigger for keyboard navigation.",
        },
      ],
    },
  },
  {
    id: "941b2c4a-10ed-4567-b389-a87987ebc103",
    repository_id: 3,
    status: "failed",
    commit_sha: "f84b9012ab",
    findings_summary: null,
    error_message:
      "Repository could not be cloned. Check the repository URL and access permissions.",
    created_at: ago(8),
    completed_at: ago(7.9),
  },
  {
    id: "941b2c4a-10ed-4567-b389-a87987ebc104",
    repository_id: 1,
    status: "completed",
    commit_sha: "b93de8122f",
    created_at: ago(26),
    completed_at: ago(25.9),
    error_message: null,
    findings_summary: {
      summary: "Review complete. No findings were reported.",
      findings: [],
    },
  },
];
