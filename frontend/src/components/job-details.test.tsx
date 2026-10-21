import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { demoJobs } from "../lib/demo";
import { JobDetails, RepositoryQuestion } from "./forms";

it("asks about a repository and shows its source references", async () => {
  const ask = vi.fn().mockResolvedValue({
    answer: "Login is handled in auth.py [1].",
    sources: [{ source: "backend/app/auth.py", start_line: 24, end_line: 61 }],
  });
  render(
    <RepositoryQuestion
      repository={{
        id: 1,
        user_id: 1,
        github_repo_id: 1,
        full_name: "acme/platform",
        clone_url: "https://github.com/acme/platform.git",
        created_at: new Date().toISOString(),
      }}
      onAsk={ask}
      onClose={() => {}}
    />,
  );
  const dialog = screen.getByRole("dialog");
  const user = userEvent.setup();
  await user.type(within(dialog).getByLabelText("Your question"), "Where is login handled?");
  await user.click(within(dialog).getByRole("button", { name: "Ask question" }));
  expect(await within(dialog).findByText("Login is handled in auth.py [1].")).toBeTruthy();
  expect(within(dialog).getByText(/backend\/app\/auth.py:24–61/)).toBeTruthy();
  expect(ask).toHaveBeenCalledWith("Where is login handled?");
});

it("explains why an older analysis has counts but no agent reviews", () => {
  render(
    <JobDetails
      job={{ ...demoJobs[0], findings_summary: {
        source_file_count: 142,
        source_chunk_count: 699,
        total_source_lines: 12620,
      } }}
      onClose={() => {}}
      onDelete={() => {}}
    />,
  );
  const dialog = screen.getByRole("dialog");
  expect(within(dialog).getByText(/saved code counts but no agent reviews/)).toBeTruthy();
  expect(within(dialog).queryByText("Ask about this repository")).toBeNull();
});

it("shows suggested review findings and reviewer errors", () => {
  render(
    <JobDetails
      job={{
        ...demoJobs[0],
        findings_summary: {
          source_file_count: 12,
          reviewed_file_count: 1,
          review_status: "partial",
          reviews: [{
            source: "app/core/security.py",
            quality: [{
              category: "quality",
              source: "app/core/security.py",
              line: 26,
              severity: "low",
              title: "Missing return type",
              explanation: "The return type is not declared.",
              evidence: "async def create_token(",
            }],
            security: [],
          }],
          review_errors: [{ source: "app/api/auth.py", error: "Review failed" }],
        },
      }}
      onClose={() => {}}
      onDelete={() => {}}
    />,
  );

  const dialog = screen.getByRole("dialog");
  expect(within(dialog).getByText("Missing return type")).toBeTruthy();
  expect(within(dialog).getByText("app/core/security.py:26")).toBeTruthy();
  expect(dialog.querySelector(".review-overview")?.textContent).toContain("1 file reviewed of 12 indexed");
  expect(dialog.querySelector(".review-errors")?.textContent).toContain("app/api/auth.py: Review failed");
  expect(within(dialog).getByText(/AI-generated suggestions/)).toBeTruthy();
});
