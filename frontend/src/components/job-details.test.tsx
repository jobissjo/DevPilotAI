import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { demoJobs } from "../lib/demo";
import { JobDetails } from "./forms";

it("asks about a completed analysis and shows its source references", async () => {
  const ask = vi.fn().mockResolvedValue({
    answer: "Login is handled in auth.py [1].",
    sources: [{ source: "backend/app/auth.py", start_line: 24, end_line: 61 }],
  });
  render(
    <JobDetails
      job={demoJobs[0]}
      onAsk={ask}
      onClose={() => {}}
      onDelete={() => {}}
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
