import { FormEvent, useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import PageMeta from "../components/PageMeta";
import { api } from "../lib/apiClient";
import { formatMoney, type CartTotals } from "../lib/types";
import { useAuth } from "../contexts/AuthContext";
import { useCart } from "../contexts/CartContext";

export default function CheckoutPage() {
  const { items, itemCount } = useCart();
  const { userEmail, profile } = useAuth();
  const [email, setEmail] = useState(userEmail || profile?.email || "");
  const [customerName, setCustomerName] = useState(profile?.full_name || "");
  const [fulfillmentMethod, setFulfillmentMethod] = useState<"pickup" | "delivery">("pickup");
  const [totals, setTotals] = useState<CartTotals | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [quoteLoading, setQuoteLoading] = useState(false);

  useEffect(() => {
    setEmail(userEmail || profile?.email || "");
    setCustomerName(profile?.full_name || "");
  }, [userEmail, profile]);

  useEffect(() => {
    if (!items.length || !email) return;
    setQuoteLoading(true);
    api
      .quoteCheckout({
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        email,
        fulfillmentMethod,
      })
      .then(setTotals)
      .catch((e) => {
        setTotals(null);
        setError(e.message);
      })
      .finally(() => setQuoteLoading(false));
  }, [items, email, fulfillmentMethod]);

  if (itemCount === 0) return <Navigate to="/cart" replace />;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { url } = await api.createCheckout({
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        email,
        customerName: customerName || undefined,
        fulfillmentMethod,
      });
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
      setLoading(false);
    }
  };

  return (
    <section className="checkout-page">
      <PageMeta title="Checkout" description="Secure checkout for Brew & Bean Coffee." path="/checkout" />
      <header className="section-head">
        <p className="eyebrow">Almost there</p>
        <h1>Checkout</h1>
        <p className="lede">Prices are calculated securely on our server before payment.</p>
      </header>

      <form onSubmit={onSubmit} className="card checkout-card">
        <label className="field">
          <span>Full name</span>
          <input
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            type="text"
            autoComplete="name"
            placeholder="Your name"
          />
        </label>
        <label className="field">
          <span>Email for receipt</span>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
          />
        </label>

        <fieldset className="field">
          <legend>Fulfillment</legend>
          <label className="radio-row">
            <input
              type="radio"
              name="fulfillment"
              checked={fulfillmentMethod === "pickup"}
              onChange={() => setFulfillmentMethod("pickup")}
            />
            Store pickup (~15 min)
          </label>
          <label className="radio-row">
            <input
              type="radio"
              name="fulfillment"
              checked={fulfillmentMethod === "delivery"}
              onChange={() => setFulfillmentMethod("delivery")}
            />
            Local delivery
          </label>
        </fieldset>

        {quoteLoading && <p className="loading-note">Calculating totals…</p>}
        {totals && (
          <dl className="receipt-list">
            {totals.lines.map((l) => (
              <div key={l.productId}>
                <dt>
                  {l.quantity}× {l.name}
                </dt>
                <dd>{formatMoney(l.lineTotalCents)}</dd>
              </div>
            ))}
            <div>
              <dt>Subtotal</dt>
              <dd>{formatMoney(totals.subtotalCents)}</dd>
            </div>
            <div>
              <dt>Tax</dt>
              <dd>{formatMoney(totals.taxCents)}</dd>
            </div>
            <div>
              <dt>{fulfillmentMethod === "delivery" ? "Delivery" : "Pickup"}</dt>
              <dd>{formatMoney(totals.shippingCents)}</dd>
            </div>
            <div>
              <dt>
                <strong>Total</strong>
              </dt>
              <dd>
                <strong>{formatMoney(totals.totalCents)}</strong>
              </dd>
            </div>
          </dl>
        )}

        {error && <p className="error" role="alert">{error}</p>}
        <button
          className="btn primary btn-block"
          type="submit"
          disabled={loading || quoteLoading || !totals}
        >
          {loading ? "Redirecting to Stripe…" : "Pay with Stripe"}
        </button>
        <Link className="text-link" to="/cart">
          ← Back to cart
        </Link>
      </form>
    </section>
  );
}
