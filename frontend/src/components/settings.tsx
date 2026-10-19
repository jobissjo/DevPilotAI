import { useState } from "react";
import type { FormEvent } from "react";
import type { User, UserUpdate } from "../lib/types";
import { ErrorMessage, errorMessage } from "./ui";
import { Icon } from "./icon";

export function Settings({
  user,
  demo,
  onSave,
  onDelete,
}: {
  user: User;
  demo: boolean;
  onSave: (values: UserUpdate) => Promise<void>;
  onDelete: () => void;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const password = String(data.get("password"));
    if (new TextEncoder().encode(password).length > 72) {
      setError("Password must be at most 72 UTF-8 bytes.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await onSave({
        full_name: String(data.get("full_name")).trim(),
        email: String(data.get("email")).trim(),
        ...(password ? { password } : {}),
      });
      const input = form.elements.namedItem("password") as HTMLInputElement;
      input.value = "";
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="settings-layout">
      <section className="panel settings-panel">
        <div className="section-heading">
          <div>
            <h2>Profile</h2>
            <p>Your details, all in one place.</p>
          </div>
          <Icon name="settings" />
        </div>
        <form className="stack-form" onSubmit={submit}>
          <div className="form-row">
            <label>
              Full name
              <input
                name="full_name"
                defaultValue={user.full_name}
                required
                maxLength={120}
              />
            </label>
            <label>
              Email address
              <input
                name="email"
                type="email"
                defaultValue={user.email}
                required
              />
            </label>
          </div>
          <label>
            New password <span className="label-optional">optional</span>
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              placeholder="Leave blank to keep your current password"
            />
          </label>
          {error && <ErrorMessage>{error}</ErrorMessage>}
          <div className="settings-save">
            <button className="button primary" disabled={busy}>
              {busy ? "Saving…" : "Save changes"}
              <Icon name="check" size={16} />
            </button>
          </div>
        </form>
      </section>
      <section className="panel connection-panel">
        <span className="card-icon">
          <Icon name="shield" />
        </span>
        <h3>A workspace that’s yours.</h3>
        <p>
          Repository access is scoped to your account. Your password is hashed
          and never included in API responses.
        </p>
        <div className="connection-state">
          <span className="live-dot" />
          {demo ? "Demo mode · sample data" : "Connected to DevPilot API"}
        </div>
      </section>
      <section className="panel danger-zone">
        <div>
          <h3>Delete account</h3>
          <p>
            This permanently deletes your account, repositories, and analysis
            jobs.
          </p>
        </div>
        <button className="button secondary danger-text" onClick={onDelete}>
          Delete account
        </button>
      </section>
    </div>
  );
}
