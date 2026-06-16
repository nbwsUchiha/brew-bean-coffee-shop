import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import PageMeta from "../components/PageMeta";
import { api } from "../lib/apiClient";
import { formatMoney, type Order } from "../lib/types";
import { useCart } from "../contexts/CartContext";

function formatWhen(iso: string) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
}

export default function SuccessPage() {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState("");
  const { clearCart } = useCart();

  useEffect(() => {
    if (!sessionId) return;
    api
      .getOrderBySession(sessionId)
      .then((o) => {
        setOrder(o);
        if (o.payment_status === "paid" || o.status === "paid") clearCart();
      })
      .catch((e) => setError(e.message));
  }, [sessionId, clearCart]);

  return (
    <section className="checkout-page">
      <PageMeta title="Order confirmed" description="Your Brew & Bean order is confirmed." path="/success" />
      <div className="card checkout-card order-receipt">
        <p className="eyebrow">Order confirmed</p>
        <h1>Thanks — we&apos;re on it!</h1>
        <p className="lede">A receipt was sent to your email with full order details.</p>

        {error && <p className="error" role="alert">{error}</p>}

        {order && (
          <dl className="receipt-list">
            <div>
              <dt>Order</dt>
              <dd>{order.order_number || order.id.slice(0, 8)}</dd>
            </div>
            {order.order_items?.map((item) => (
              <div key={item.id}>
                <dt>Item</dt>
                <dd>
                  {item.quantity}× {item.product_name}
                </dd>
              </div>
            ))}
            <div>
              <dt>Amount</dt>
              <dd>{formatMoney(order.total_cents || order.amount_cents)}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd className="status-paid">{order.order_status || order.status}</dd>
            </div>
            <div>
              <dt>Placed at</dt>
              <dd>{formatWhen(order.paid_at || order.created_at)}</dd>
            </div>
            <div>
              <dt>Fulfillment</dt>
              <dd className="capitalize">{order.fulfillment_method || "pickup"}</dd>
            </div>
          </dl>
        )}

        {!order && !error && sessionId && <p className="loading-note">Loading your order…</p>}

        <Link className="btn primary btn-block" to="/catalog">
          Order another
        </Link>
        <Link className="text-link" to="/account">
          View order history
        </Link>
      </div>
    </section>
  );
}
