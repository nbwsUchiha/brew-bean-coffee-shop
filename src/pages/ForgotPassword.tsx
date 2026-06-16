import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import PageMeta from "../components/PageMeta";
import { useAuth } from "../contexts/AuthContext";

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await resetPassword(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send reset email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="checkout-page">
      <PageMeta title="Forgot password" description="Reset your Brew & Bean password." path="/forgot-password" />
      <header className="section-head">
        <h1>Forgot password</h1>
        <p className="lede">We&apos;ll email you a link to choose a new password.</p>
      </header>
      {sent ? (
        <div className="card checkout-card success-note" role="status">
          If an account exists for {email}, a reset link has been sent.
        </div>
      ) : (
        <form onSubmit={onSubmit} className="card checkout-card">
          <label className="field">
            <span>Email</span>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          {error && <p className="error" role="alert">{error}</p>}
          <button className="btn primary btn-block" type="submit" disabled={loading}>
            {loading ? "Sending…" : "Send reset link"}
          </button>
        </form>
      )}
      <Link className="text-link" to="/login">
        ← Back to sign in
      </Link>
    </section>
  );
}
