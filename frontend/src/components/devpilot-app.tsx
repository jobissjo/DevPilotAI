import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiClient } from "../lib/api";
import { demoUser } from "../lib/demo";
import type { User } from "../lib/types";
import { AuthScreen } from "./auth";
import { Logo } from "./ui";
import { Workspace } from "./workspace";

const TOKEN_KEY = "devpilot.access-token";

export function DevPilotApp() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string>();
  const [restoring, setRestoring] = useState(true);
  const [demo, setDemo] = useState(false);
  const [notice, setNotice] = useState("");

  const signOut = useCallback(() => {
    try {
      sessionStorage.removeItem(TOKEN_KEY);
    } catch {
      /* In-memory sign-in remains available when storage is blocked. */
    }
    setUser(null);
    setToken(undefined);
    setDemo(false);
  }, []);

  const expired = useCallback(() => {
    signOut();
    setNotice("Your session ended. Sign in to continue.");
  }, [signOut]);
  const api = useMemo(() => new ApiClient(token, expired), [token, expired]);

  useEffect(() => {
    let active = true;
    let saved: string | null = null;
    try {
      saved = sessionStorage.getItem(TOKEN_KEY);
    } catch {
      /* Storage is optional. */
    }
    if (!saved) {
      setRestoring(false);
      return;
    }
    new ApiClient(saved)
      .me()
      .then((current) => {
        if (active) {
          setUser(current);
          setToken(saved ?? undefined);
        }
      })
      .catch(() => {
        if (active) {
          signOut();
          setNotice("We couldn’t restore your session. Please sign in again.");
        }
      })
      .finally(() => {
        if (active) setRestoring(false);
      });
    return () => {
      active = false;
    };
  }, [signOut]);

  async function signIn(accessToken: string) {
    const current = await new ApiClient(accessToken).me();
    try {
      sessionStorage.setItem(TOKEN_KEY, accessToken);
    } catch {
      /* Fall back to an in-memory session. */
    }
    setToken(accessToken);
    setUser(current);
    setNotice("");
    setDemo(false);
  }

  if (restoring)
    return (
      <div className="app-loading">
        <Logo />
        <span className="loader" />
        <p>Opening your workspace…</p>
      </div>
    );
  if (!user)
    return (
      <AuthScreen
        onSignIn={signIn}
        notice={notice}
        onDemo={() => {
          setUser(demoUser);
          setDemo(true);
          setNotice("");
        }}
      />
    );
  return (
    <Workspace
      key={demo ? "demo" : token}
      api={api}
      user={user}
      demo={demo}
      onSignOut={signOut}
      onUpdateUser={setUser}
    />
  );
}
