import { Link, useSearchParams } from "react-router-dom";
import { useEffect } from "react";
import PageMeta from "../components/PageMeta";
import { formatMoney } from "../lib/types";
import { useCart } from "../contexts/CartContext";
import { useAuth } from "../contexts/AuthContext";
import { useOrderPolling } from "../hooks/useOrderPolling";

function formatWhen(iso: string) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(iso),
  );
}

export default function SuccessPage() {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const { order, error, state, retry } = useOrderPolling(sessionId);
  const { clearCart } = useCart();
  const { userEmail } = useAuth();

  useEffect(() => {
    if (state === "confirmed") clearCart();
  }, [state, clearCart]);

  const isGuest = order && !order.user_id;
  const guestEmail = order?.customer_email;

  return (
    <section className="checkout-page">
      <PageMeta title="Order confirmed" description="Your Brew & Bean order is confirmed." path="/success" />
      <div className="card checkout-card order-receipt">
        {state === "processing" && (
          <>
            <p className="eyebrow">Processing payment</p>
            <h1>Processing your payment…</h1>
            <p className="lede processing-note" role="status">
              Please wait while we confirm your order with our payment provider. This usually takes a
              few seconds.
            </p>
            <div className="processing-spinner" aria-hidden="true" />
          </>
        )}

        {state === "timeout" && (
          <>
            <p className="eyebrow">Still processing</p>
            <h1>Payment is taking longer than expected</h1>
            <p className="lede">
              Your payment may still be processing. You can refresh this page or check your email for a
              receipt shortly.
            </p>
            {error && <p className="error" role="alert">{error}</p>}
            <button className="btn primary btn-block" type="button" onClick={retry}>
              Check again
            </button>
          </>
        )}

        {state === "failed" && order && (
          <>
            <p className="eyebrow">Payment issue</p>
            <h1>We couldn&apos;t confirm your payment</h1>
            <p className="lede">
              Order {order.order_number || order.id.slice(0, 8)} is marked{" "}
              <strong>{order.payment_status || order.order_status}</strong>. No charge was completed or
              the session expired.
            </p>
            <Link className="btn primary btn-block" to="/cart">
              Return to cart
            </Link>
          </>
        )}

        {state === "confirmed" && order && (
          <>
            <p className="eyebrow">Order confirmed</p>
            <h1>Thanks — we&apos;re on it!</h1>
            <p className="lede">
              {order.customer_email
                ? `A receipt will be sent to ${order.customer_email}.`
                : "Your order is confirmed."}
            </p>

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

            {isGuest && (
              <div className="guest-order-note card">
                <h2>Save this order to your account</h2>
                <p>
                  This order was placed as a guest and isn&apos;t linked to an account yet. Create an
                  account with the same email address ({guestEmail}) and we&apos;ll securely attach past
                  guest orders after you verify your email.
                </p>
                <Link
                  className="btn ghost"
                  to="/login"
                  state={{ from: "/account", signupEmail: guestEmail }}
                >
                  Create account or sign in
                </Link>
              </div>
            )}

            <Link className="btn primary btn-block" to="/catalog">
              Order another
            </Link>
            {userEmail ? (
              <Link className="text-link" to="/account">
                View order history
              </Link>
            ) : (
              <p className="muted-note">Keep your order number for pickup: {order.order_number}</p>
            )}
          </>
        )}

        {!sessionId && (
          <>
            <h1>Missing checkout session</h1>
            <p className="lede">Return to the menu to place an order.</p>
            <Link className="btn primary" to="/catalog">
              Browse menu
            </Link>
          </>
        )}

        {error && state !== "timeout" && state !== "processing" && (
          <p className="error" role="alert">{error}</p>
        )}
      </div>
    </section>
  );
}
