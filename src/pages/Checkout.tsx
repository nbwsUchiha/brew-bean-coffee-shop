import { FormEvent, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../lib/apiClient";
import { useAuth } from "../contexts/AuthContext";

export default function CheckoutPage() {
  const [params] = useSearchParams();
  const itemId = params.get("item") || "";
  const { userEmail } = useAuth();
  const [email, setEmail] = useState(userEmail || "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!itemId) {
      setError("Missing item. Go back to the menu.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { url } = await api.createCheckout(itemId, email);
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
      setLoading(false);
    }
  };

  return (
    <section className="checkout-page">
      <header className="section-head">
        <p className="eyebrow">Almost there</p>
        <h1>Checkout</h1>
        <p className="lede">We&apos;ll email your receipt and have your drink ready for pickup.</p>
      </header>

      <form onSubmit={onSubmit} className="card checkout-card">
        <label className="field">
          <span>Email for receipt</span>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            type="email"
            placeholder="you@example.com"
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="btn primary btn-block" type="submit" disabled={loading}>
          {loading ? "Redirecting to Stripe…" : "Pay with Stripe"}
        </button>
        <Link className="text-link" to="/catalog">
          ← Back to menu
        </Link>
      </form>
    </section>
  );
}
