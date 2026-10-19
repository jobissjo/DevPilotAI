import { useState } from "react";
import type { FormEvent } from "react";
import { ApiClient } from "../lib/api";
import { Icon } from "./icon";
import { ErrorMessage, Logo, errorMessage } from "./ui";

export function AuthScreen({
  onSignIn,
  onDemo,
  notice,
}: {
  onSignIn: (token: string) => Promise<void>;
  onDemo: () => void;
  notice: string;
}) {
  const [register, setRegister] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email")).trim();
    const password = String(data.get("password"));
    if (new TextEncoder().encode(password).length > 72) {
      setError("Password must be at most 72 UTF-8 bytes.");
      return;
    }
    setBusy(true);
    setError("");
    const api = new ApiClient();
    try {
      if (register)
        await api.register({
          full_name: String(data.get("name")).trim(),
          email,
          password,
        });
      const result = await api.login(email, password);
      await onSignIn(result.access_token);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-layout">
      <section className="auth-story">
        <Logo />
        <div className="auth-story-content">
          <span className="eyebrow">
            <span className="live-dot" /> YOUR NEXT PAIR PROGRAMMER
          </span>
          <h1>
            A fresh perspective
            <br />
            on every
            <br />
            <span>line of code.</span>
          </h1>
          <p>
            One workspace for your repositories, code reviews, and the insights
            that move your project forward.
          </p>
          <div className="code-window">
            <div className="code-window-bar">
              <span />
              <span />
              <span />
              <small>review.ts</small>
              <span className="code-window-label">DEVPILOT AI</span>
            </div>
            <div className="code-lines">
              <div>
                <i>01</i>
                <span className="syntax-purple">const</span> review ={" "}
                <span className="syntax-purple">await</span> devpilot.
                <span className="syntax-green">analyze</span>({"{"}
              </div>
              <div>
                <i>02</i>&nbsp; repository:{" "}
                <span className="syntax-green">'your/next-big-thing'</span>,
              </div>
              <div>
                <i>03</i>&nbsp; perspective:{" "}
                <span className="syntax-green">'a little more clarity'</span>,
              </div>
              <div>
                <i>04</i>
                {"}"})
              </div>
            </div>
            <div className="code-insight">
              <Icon name="spark" />
              <div>
                <strong>Good code starts with a second look.</strong>
                <span>
                  Bring your repositories. Find your next improvement.
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="auth-story-footer">
          <span>
            <Icon name="shield" size={15} /> Your workspace. Your code.
          </span>
          <span>Built for builders.</span>
        </div>
      </section>
      <section className="auth-form-side">
        <div className="auth-form-wrap">
          <span className="pill">
            <Icon name="spark" size={13} /> A CLEARER WAY TO BUILD
          </span>
          <h2>{register ? "Create your workspace" : "Welcome back."}</h2>
          <p className="muted">
            {register
              ? "Your next great project starts here."
              : "Good to see you. Let’s get back to building."}
          </p>
          {notice && (
            <div className="info-banner" role="status">
              {notice}
            </div>
          )}
          <form onSubmit={submit} className="stack-form">
            {register && (
              <label>
                Full name
                <input
                  name="name"
                  autoComplete="name"
                  required
                  maxLength={120}
                  placeholder="Alex Morgan"
                />
              </label>
            )}
            <label>
              Email address
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@company.com"
              />
            </label>
            <label>
              Password
              <input
                name="password"
                type="password"
                autoComplete={register ? "new-password" : "current-password"}
                minLength={register ? 8 : 1}
                required
                placeholder={
                  register ? "At least 8 characters" : "Enter your password"
                }
              />
            </label>
            {error && <ErrorMessage>{error}</ErrorMessage>}
            <button className="button primary full-width" disabled={busy}>
              {busy
                ? "One moment…"
                : register
                  ? "Create account"
                  : "Sign in to workspace"}
              {!busy && <Icon name="arrow" size={17} />}
            </button>
          </form>
          <p className="auth-switch">
            {register ? "Already have an account?" : "New to DevPilot?"}{" "}
            <button
              className="text-button"
              disabled={busy}
              onClick={() => {
                setRegister(!register);
                setError("");
              }}
            >
              {register ? "Sign in" : "Create an account"}
            </button>
          </p>
          <div className="auth-divider">
            <span />
            or take a look around
            <span />
          </div>
          <button
            className="button secondary full-width"
            disabled={busy}
            onClick={onDemo}
          >
            Explore the demo workspace
            <Icon name="arrow" size={16} />
          </button>
          <p className="auth-note">Sample repositories. No account needed.</p>
        </div>
        <span className="auth-copyright">
          © {new Date().getFullYear()} DevPilot AI
        </span>
      </section>
    </div>
  );
}
