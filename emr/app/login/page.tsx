"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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
  const [resetOpen, setResetOpen] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setInfo("");
    setPending(true);
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") || "");
    const password = String(form.get("password") || "");
    const supabase = createClient();

    if (resetOpen) {
      const origin = window.location.origin;
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/login`
      });
      setPending(false);
      if (resetError) {
        setError(resetError.message);
        return;
      }
      setInfo("If that email is on the staff list, a reset link is on its way.");
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
            MOVE • RECOVER •
            <br />
            <em>LIVE BETTER.</em>
          </h2>
          <span className="auth-rule" />
          <p>
            Care documentation,
            <br />
            securely connected.
          </p>
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
          <img className="auth-mark" src="/logo-mark.png" alt="" />
          <p className="kicker">
            Relief Motion
            <span>PHYSIOTHERAPY</span>
          </p>
          <h1>Welcome back</h1>
          <p className="auth-lead">Sign in to continue.</p>
          {error ? <div className="error">{error}</div> : null}
          {info ? <div className="ok">{info}</div> : null}
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
              placeholder="Enter your email address"
              required
            />
          </div>
          {resetOpen ? null : (
            <div className="field">
              <label htmlFor="password">Password</label>
              <svg className="lead icon-line" viewBox="0 0 24 24" aria-hidden="true">
                <rect x="5" y="10" width="14" height="10" rx="2" />
                <path d="M8 10V8a4 4 0 0 1 8 0v2" />
              </svg>
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Enter your password"
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
          <button className="forgot" type="button" onClick={() => setResetOpen((open) => !open)}>
            {resetOpen ? "Back to sign in" : "Forgot password?"}
          </button>
          <button className="btn btn-block" type="submit" disabled={pending}>
            {pending ? "Please wait…" : resetOpen ? "Send reset link" : "Sign in →"}
          </button>
          <p className="auth-or">or</p>
          <p className="auth-protected">
            <span>
              <svg className="icon-line" viewBox="0 0 24 24" aria-hidden="true">
                <rect x="5" y="10" width="14" height="10" rx="2" />
                <path d="M8 10V8a4 4 0 0 1 8 0v2" />
              </svg>
            </span>
            Protected staff access
          </p>
        </form>
      </section>
    </div>
  );
}
