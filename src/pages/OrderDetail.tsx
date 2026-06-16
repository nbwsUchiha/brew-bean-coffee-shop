import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PageMeta from "../components/PageMeta";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { api } from "../lib/apiClient";
import { formatMoney, type Order } from "../lib/types";

function OrderDetailContent() {
  const { id = "" } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getOrder(id).then(setOrder).catch((e) => setError(e.message));
  }, [id]);

  if (error) return <p className="error" role="alert">{error}</p>;
  if (!order) return <p className="loading-note">Loading order…</p>;

  return (
    <section className="checkout-page">
      <PageMeta title={`Order ${order.order_number || ""}`} description="Order details" path={`/orders/${id}`} />
      <Link className="text-link" to="/account">
        ← Back to account
      </Link>
      <div className="card checkout-card order-receipt">
        <h1>Order {order.order_number}</h1>
        <dl className="receipt-list">
          <div>
            <dt>Status</dt>
            <dd className="status-paid">{order.order_status}</dd>
          </div>
          <div>
            <dt>Payment</dt>
            <dd>{order.payment_status}</dd>
          </div>
          <div>
            <dt>Fulfillment</dt>
            <dd className="capitalize">{order.fulfillment_method}</dd>
          </div>
          {order.order_items?.map((item) => (
            <div key={item.id}>
              <dt>
                {item.quantity}× {item.product_name}
              </dt>
              <dd>{formatMoney(item.line_total_cents)}</dd>
            </div>
          ))}
          <div>
            <dt>Total</dt>
            <dd>{formatMoney(order.total_cents || order.amount_cents)}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}

export default function OrderDetailPage() {
  return (
    <ProtectedRoute>
      <OrderDetailContent />
    </ProtectedRoute>
  );
}
