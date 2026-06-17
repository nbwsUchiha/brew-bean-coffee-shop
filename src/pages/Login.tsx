import { FormEvent, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import PageMeta from "../components/PageMeta";
import { useAuth } from "../contexts/AuthContext";

export default function LoginPage() {
  const { userEmail, signIn, signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string; signupEmail?: string })?.from || "/account";
  const signupEmail = (location.state as { signupEmail?: string })?.signupEmail;

  useEffect(() => {
    if (userEmail) navigate(from, { replace: true });
  }, [userEmail, from, navigate]);

  useEffect(() => {
    if (signupEmail && mode === "signup") setEmail(signupEmail);
  }, [signupEmail, mode]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);
    try {
      if (mode === "signin") await signIn(email, password);
      else {
        await signUp(email, password, fullName || undefined);
        setInfo("Check your email to verify your account, then sign in.");
        setMode("signin");
        setLoading(false);
        return;
      }
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Auth failed");
    } finally {
      setLoading(false);
    }
  };

  if (userEmail) {
    return <p className="loading-note">Redirecting…</p>;
  }

  return (
    <section className="checkout-page">
      <PageMeta title="Sign in" description="Sign in to your Brew & Bean account." path="/login" />
      <header className="section-head">
        <p className="eyebrow">Members</p>
        <h1>{mode === "signin" ? "Sign in" : "Create account"}</h1>
      </header>
      <form onSubmit={onSubmit} className="card checkout-card">
        {mode === "signup" && (
          <label className="field">
            <span>Full name</span>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoComplete="name"
              placeholder="Your name"
            />
          </label>
        )}
        <label className="field">
          <span>Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            placeholder="you@example.com"
          />
        </label>
        <label className="field">
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            placeholder="••••••••"
            minLength={8}
          />
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        {info && <p className="success-note" role="status">{info}</p>}
        <button className="btn primary btn-block" type="submit" disabled={loading}>
          {loading ? "Please wait…" : mode === "signin" ? "Sign in" : "Sign up"}
        </button>
        <button
          className="text-link"
          type="button"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        >
          {mode === "signin" ? "Need an account? Sign up" : "Already have an account? Sign in"}
        </button>
        {mode === "signin" && (
          <Link className="text-link" to="/forgot-password">
            Forgot password?
          </Link>
        )}
      </form>
    </section>
  );
}
