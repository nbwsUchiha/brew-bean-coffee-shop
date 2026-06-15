import { FormEvent, useState } from "react";
import { useSearchParams } from "react-router-dom";
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
    if (!itemId) { setError("Missing item. Go back to the catalog."); return; }
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
    <section>
      <h1>Checkout</h1>
      <form onSubmit={onSubmit} className="card" style={{ maxWidth: 420 }}>
        <label>
          Email
          <input value={email} onChange={(e) => setEmail(e.target.value)} required type="email" style={{ display: "block", width: "100%", marginTop: 8, padding: 8 }} />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="btn primary" type="submit" disabled={loading} style={{ marginTop: 16, border: 0, cursor: "pointer" }}>
          {loading ? "Redirecting…" : "Pay with Stripe"}
        </button>
      </form>
    </section>
  );
}
