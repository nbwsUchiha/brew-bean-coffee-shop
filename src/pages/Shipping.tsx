import PageMeta from "../components/PageMeta";

export default function ShippingPage() {
  return (
    <section className="content-page prose">
      <PageMeta title="Pickup & Delivery" description="Pickup and delivery information for Brew & Bean." path="/shipping" />
      <h1>Pickup &amp; delivery</h1>
      <div className="card checkout-card">
        <h2>Store pickup</h2>
        <p>Order online and pick up at the counter. Most drinks are ready in ~15 minutes after payment.</p>
        <h2>Local delivery</h2>
        <p>
          Delivery is available within our local service area. The delivery fee is calculated at checkout.
          Someone should be available to receive the order.
        </p>
      </div>
    </section>
  );
}
