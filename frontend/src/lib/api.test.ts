import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiClient } from "./api";

afterEach(() => vi.restoreAllMocks());

describe("DevPilot API client", () => {
  it("sends the OAuth password form and bearer token in the required formats", async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation(
        async () => new Response(JSON.stringify({ access_token: "token" })),
      );
    vi.stubGlobal("fetch", fetchMock);
    await new ApiClient().login("alex@example.com", "password123");
    expect(fetchMock.mock.calls[0][0]).toBe("/api/auth/token");
    expect(fetchMock.mock.calls[0][1].body.toString()).toBe(
      "username=alex%40example.com&password=password123",
    );
    await new ApiClient("token").me();
    expect(fetchMock.mock.calls[1][1].headers.get("Authorization")).toBe(
      "Bearer token",
    );
  });

  it("loads all pages instead of silently truncating repositories at the API limit", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify(Array.from({ length: 100 }, (_, id) => ({ id }))),
        ),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify([{ id: 100 }])));
    vi.stubGlobal("fetch", fetchMock);
    const result = await new ApiClient("token").repositories();
    expect(result).toHaveLength(101);
    expect(fetchMock.mock.calls[1][0]).toBe(
      "/api/repositories?offset=100&limit=100",
    );
  });

  it("handles empty delete responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 204 })),
    );
    await expect(
      new ApiClient("token").deleteRepository(1),
    ).resolves.toBeUndefined();
  });

  it("sends an authenticated question to its analysis job", async () => {
    const response = { answer: "Login is in auth.py [1].", sources: [] };
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(response)));
    vi.stubGlobal("fetch", fetchMock);
    await expect(new ApiClient("token").askJob("job-1", "Where is login?"))
      .resolves.toEqual(response);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/jobs/job-1/questions");
    expect(fetchMock.mock.calls[0][1].headers.get("Authorization")).toBe("Bearer token");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ question: "Where is login?" });
  });

  it("clears an expired authenticated session and preserves the API error", async () => {
    const expired = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ detail: "Invalid token" }), {
            status: 401,
          }),
        ),
    );
    await expect(new ApiClient("token", expired).me()).rejects.toThrow(
      "Invalid token",
    );
    expect(expired).toHaveBeenCalledOnce();
  });

  it("turns validation errors and offline errors into readable messages", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({
              detail: [{ loc: ["body", "email"], msg: "Invalid email" }],
            }),
            { status: 422 },
          ),
        ),
    );
    await expect(new ApiClient().me()).rejects.toThrow("email: Invalid email");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("Failed to fetch")),
    );
    await expect(new ApiClient().me()).rejects.toThrow("Cannot reach DevPilot");
  });
});
