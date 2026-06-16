import { FormEvent, useState } from "react";
import { useAuth } from "../contexts/AuthContext";

export default function LoginPage() {
  const { userEmail, signIn, signUp, signOut } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [error, setError] = useState("");

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      if (mode === "signin") await signIn(email, password);
      else await signUp(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Auth failed");
    }
  };

  if (userEmail) {
    return (
      <section className="checkout-page">
        <div className="card checkout-card">
          <p className="eyebrow">Welcome back</p>
          <h1>Your account</h1>
          <p className="lede">Signed in as {userEmail}</p>
          <button className="btn primary btn-block" type="button" onClick={() => signOut()}>
            Sign out
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="checkout-page">
      <header className="section-head">
        <p className="eyebrow">Members</p>
        <h1>{mode === "signin" ? "Sign in" : "Create account"}</h1>
      </header>
      <form onSubmit={onSubmit} className="card checkout-card">
        <label className="field">
          <span>Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
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
            placeholder="••••••••"
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="btn primary btn-block" type="submit">
          {mode === "signin" ? "Sign in" : "Sign up"}
        </button>
        <button
          className="text-link"
          type="button"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        >
          {mode === "signin" ? "Need an account? Sign up" : "Already have an account? Sign in"}
        </button>
      </form>
    </section>
  );
}
