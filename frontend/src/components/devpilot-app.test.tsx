import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DevPilotApp } from "./devpilot-app";

describe("Workspace integration", () => {
  it("keeps the demo separate from the API and supports repository and job actions", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<DevPilotApp />);
    await user.click(
      await screen.findByRole("button", { name: /Explore the demo/ }),
    );
    await screen.findByText("Let’s build something, Alex.");
    await user.click(screen.getByRole("button", { name: /^Repositories/ }));
    await user.click(
      screen.getByRole("button", { name: "Connect repository" }),
    );
    const modal = screen.getByRole("dialog");
    await user.type(
      within(modal).getByLabelText("Repository name"),
      "alex/my-app",
    );
    expect(within(modal).queryByLabelText(/GitHub repository ID/)).toBeNull();
    await user.type(
      within(modal).getByLabelText("Clone URL"),
      "https://github.com/alex/my-app.git",
    );
    await user.click(
      within(modal).getByRole("button", { name: "Connect repository" }),
    );
    await screen.findByRole("button", { name: "my-app" });
    await user.click(
      screen.getByRole("button", { name: "Disconnect alex/my-app" }),
    );
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Disconnect repository",
      }),
    );
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "my-app" })).toBeNull(),
    );
    await user.click(screen.getByRole("button", { name: /^Analyses/ }));
    await user.click(screen.getByRole("button", { name: "Failed" }));
    expect(screen.getByText("platform-web")).toBeTruthy();
    expect(screen.queryByText("commerce-api")).toBeNull();
    await user.click(screen.getByRole("button", { name: "New analysis" }));
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Queue analysis",
      }),
    );
    await within(screen.getByRole("table")).findByText("Queued");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(sessionStorage.getItem("devpilot.access-token")).toBeNull();
  });

  it("logs in through the real API client, updates profile, and signs out", async () => {
    const fetchMock = vi.fn(async (path: string, options?: RequestInit) => {
      const body = path.endsWith("/auth/token")
        ? { access_token: "real-token", token_type: "bearer" }
        : path.includes("/repositories")
          ? []
          : options?.method === "PATCH"
            ? { id: 7, full_name: "New Name", email: "dev@example.com" }
            : { id: 7, full_name: "Developer", email: "dev@example.com" };
      return new Response(JSON.stringify(body), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<DevPilotApp />);
    await user.type(
      await screen.findByLabelText("Email address"),
      "dev@example.com",
    );
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(
      screen.getByRole("button", { name: /Sign in to workspace/ }),
    );
    await screen.findByText("Let’s build something, Developer.");
    expect(sessionStorage.getItem("devpilot.access-token")).toBe("real-token");
    await user.click(screen.getByRole("button", { name: "Settings" }));
    const name = screen.getByLabelText("Full name");
    fireEvent.change(name, { target: { value: "New Name" } });
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await screen.findByText("Profile updated successfully.");
    expect(
      fetchMock.mock.calls.some(
        ([path, options]) =>
          path === "/api/users/me" && options?.method === "PATCH",
      ),
    ).toBe(true);
    await user.click(screen.getByRole("button", { name: "Sign out" }));
    await screen.findByText("Welcome back.");
    expect(sessionStorage.getItem("devpilot.access-token")).toBeNull();
  });

  it("shows backend failures instead of treating a rejected sign-in as success", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({ detail: "Incorrect email or password" }),
            { status: 401 },
          ),
        ),
    );
    const user = userEvent.setup();
    render(<DevPilotApp />);
    await user.type(
      await screen.findByLabelText("Email address"),
      "dev@example.com",
    );
    await user.type(screen.getByLabelText("Password"), "wrongpassword");
    await user.click(
      screen.getByRole("button", { name: /Sign in to workspace/ }),
    );
    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      "Incorrect email or password",
    );
    expect(sessionStorage.getItem("devpilot.access-token")).toBeNull();
  });
});
