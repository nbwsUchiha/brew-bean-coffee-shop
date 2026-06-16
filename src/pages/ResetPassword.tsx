import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PageMeta from "../components/PageMeta";
import { useAuth } from "../contexts/AuthContext";

export default function ResetPasswordPage() {
  const { updatePassword } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (window.location.hash.includes("type=recovery")) return;
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await updatePassword(password);
      navigate("/account");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="checkout-page">
      <PageMeta title="Reset password" description="Choose a new password." path="/reset-password" />
      <h1>Reset password</h1>
      <form onSubmit={onSubmit} className="card checkout-card">
        <label className="field">
          <span>New password</span>
          <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <label className="field">
          <span>Confirm password</span>
          <input type="password" required minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="btn primary btn-block" type="submit" disabled={loading}>
          {loading ? "Saving…" : "Update password"}
        </button>
      </form>
      <Link className="text-link" to="/login">
        Sign in
      </Link>
    </section>
  );
}
