import PageMeta from "../components/PageMeta";

export default function RefundsPage() {
  return (
    <section className="content-page prose">
      <PageMeta title="Refund Policy" description="Brew & Bean Coffee refund policy." path="/refunds" />
      <h1>Refund policy</h1>
      <div className="card checkout-card">
        <p>If we cannot fulfill your order, you will receive a full refund to your original payment method.</p>
        <p>Quality issues should be reported within 24 hours via our contact form with your order number.</p>
        <p>Canceled orders before preparation begins are eligible for a full refund.</p>
      </div>
    </section>
  );
}
