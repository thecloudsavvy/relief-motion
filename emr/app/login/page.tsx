"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { authParamsFromHref, claimAuthFromHref } from "@/lib/supabase/claim-session";

type Mode = "signin" | "reset" | "set-password";

function LineIcon({ d }: { d: string }) {
  return (
    <svg className="icon-line" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<Mode>("signin");
  const [inviteEmail, setInviteEmail] = useState("");

  useEffect(() => {
    const href = window.location.href;
    const params = authParamsFromHref(href);
    const needsPassword = params.isPasswordFlow;
    if (needsPassword) setMode("set-password");
    const query = new URLSearchParams(window.location.search);
    const fromQuery = query.get("error");
    if (fromQuery) setError(fromQuery);

    const supabase = createClient();
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setMode("set-password");
    });

    let cancelled = false;
    void (async () => {
      const { error: claimError } = await claimAuthFromHref(supabase, href);
      if (cancelled) return;
      if (claimError) {
        setError(claimError.message);
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      if (cancelled) return;
      const email = sessionData.session?.user.email || "";

      if (needsPassword) {
        if (!sessionData.session) {
          setError("This invite link is missing or has already been used. Ask an admin to send a new one.");
          return;
        }
        setInviteEmail(email);
        window.history.replaceState({}, "", "/login?set=1");
        return;
      }

      if (sessionData.session) {
        router.replace("/");
      }
    })();

    return () => {
      cancelled = true;
      data.subscription.unsubscribe();
    };
  }, [router]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setInfo("");
    setPending(true);
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") || "");
    const password = String(form.get("password") || "");
    const confirm = String(form.get("confirm") || "");
    const supabase = createClient();

    if (mode === "reset") {
      const origin = window.location.origin;
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/auth/callback`
      });
      setPending(false);
      if (resetError) {
        setError(resetError.message);
        return;
      }
      setInfo("If that email is on the staff list, a reset link is on its way.");
      return;
    }

    if (mode === "set-password") {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        setPending(false);
        setError("This invite link is missing or has already been used. Ask an admin to send a new one.");
        return;
      }
      if (password.length < 8) {
        setPending(false);
        setError("Use at least 8 characters.");
        return;
      }
      if (password !== confirm) {
        setPending(false);
        setError("Those passwords do not match.");
        return;
      }
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setPending(false);
        setError(updateError.message);
        return;
      }
      router.push("/");
      router.refresh();
      return;
    }

    const { error: signError } = await supabase.auth.signInWithPassword({ email, password });
    if (signError) {
      setPending(false);
      setError(signError.message);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="auth-shell">
      <section className="auth-visual">
        <div className="auth-slides" aria-hidden="true">
          <img src="/login-slide-1.jpg" alt="" />
          <img src="/login-slide-2.jpg" alt="" />
          <img src="/login-slide-3.jpg" alt="" />
        </div>
        <div className="auth-brand">
          <img src="/logo-mark.png" alt="" />
          <div>
            <strong>Relief Motion</strong>
            <span>PHYSIOTHERAPY</span>
          </div>
        </div>
        <div className="auth-copy">
          <h2>
            Every home visit,
            <br />
            documented.
          </h2>
          <p>Patient records for the Relief Motion team.</p>
        </div>
        <ul className="auth-points">
          <li>
            <LineIcon d="M12 12a3.5 3.5 0 1 0-3.5-3.5A3.5 3.5 0 0 0 12 12zm-7 8.2C5 17.6 8 16 12 16s7 1.6 7 4.2V21H5z" />
            Better
            <br />
            Patient Care
          </li>
          <li>
            <LineIcon d="M7 3h8l5 5v13H7zm7 1.5V9h4.5zM9 12h8v1.5H9zm0 3.5h8V17H9z" />
            Structured
            <br />
            Records
          </li>
          <li>
            <LineIcon d="M12 3 5 6v6c0 4.4 2.9 8.4 7 9.5 4.1-1.1 7-5.1 7-9.5V6zm-1 12-3-3 1.4-1.4L11 12.2l4.6-4.6L17 9z" />
            Secure
            <br />
            &amp; Private
          </li>
          <li>
            <LineIcon d="M4 19h16v2H4zm3-3V11h2.5v5zm5.25 0V7h2.5v9zM17.5 16v-4H20v4z" />
            Support
            <br />
            Continuity of Care
          </li>
        </ul>
      </section>

      <section className="auth-panel">
        <form className="auth-card" onSubmit={onSubmit} autoComplete="off">
          <h1>
            {mode === "set-password" ? "Set your password" : mode === "reset" ? "Reset password" : "Sign in"}
          </h1>
          <p className="auth-lead">
            {mode === "set-password"
              ? inviteEmail
                ? `Choose a password for ${inviteEmail}.`
                : "Choose a password for your staff account."
              : mode === "reset"
                ? "We’ll email a reset link if that address is on the staff list."
                : "Use your staff email."}
          </p>
          {error ? <div className="error">{error}</div> : null}
          {info ? <div className="ok">{info}</div> : null}
          {mode === "set-password" ? null : (
            <div className="field">
              <label htmlFor="email">Email</label>
              <svg className="lead icon-line" viewBox="0 0 24 24" aria-hidden="true">
                <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
                <path d="m5 8 7 5 7-5" />
              </svg>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="username"
                placeholder="you@reliefmotionphysio.com"
                required
              />
            </div>
          )}
          {mode === "reset" ? null : (
            <div className="field">
              <div className="field-head">
                <label htmlFor="password">{mode === "set-password" ? "New password" : "Password"}</label>
                {mode === "set-password" ? null : (
                  <button
                    className="forgot"
                    type="button"
                    onClick={() => setMode((current) => (current === "reset" ? "signin" : "reset"))}
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <svg className="lead icon-line" viewBox="0 0 24 24" aria-hidden="true">
                <rect x="5" y="10" width="14" height="10" rx="2" />
                <path d="M8 10V8a4 4 0 0 1 8 0v2" />
              </svg>
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete={mode === "set-password" ? "new-password" : "current-password"}
                placeholder={mode === "set-password" ? "At least 8 characters" : "Enter password"}
                required
              />
              <button
                className="peek"
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((open) => !open)}
              >
                <svg className="icon-line" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </button>
            </div>
          )}
          {mode === "set-password" ? (
            <div className="field">
              <label htmlFor="confirm">Confirm password</label>
              <svg className="lead icon-line" viewBox="0 0 24 24" aria-hidden="true">
                <rect x="5" y="10" width="14" height="10" rx="2" />
                <path d="M8 10V8a4 4 0 0 1 8 0v2" />
              </svg>
              <input
                id="confirm"
                name="confirm"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Re-enter your password"
                required
              />
            </div>
          ) : null}
          {mode === "reset" ? (
            <button
              className="forgot forgot-block"
              type="button"
              onClick={() => setMode("signin")}
            >
              Back to sign in
            </button>
          ) : null}
          <button className="btn btn-block" type="submit" disabled={pending}>
            {pending
              ? "Please wait…"
              : mode === "reset"
                ? "Send reset link"
                : mode === "set-password"
                  ? "Save password"
                  : "Sign in"}
          </button>
          <p className="auth-staff-note">
            <svg className="icon-line" viewBox="0 0 24 24" aria-hidden="true">
              <rect x="5" y="10" width="14" height="10" rx="2" />
              <path d="M8 10V8a4 4 0 0 1 8 0v2" />
            </svg>
            Staff only. Every sign-in is logged.
          </p>
        </form>
        <p className="auth-invite-hint">No account yet? Ask your admin to add you.</p>
      </section>
    </div>
  );
}
