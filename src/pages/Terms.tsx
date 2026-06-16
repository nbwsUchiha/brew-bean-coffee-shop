import PageMeta from "../components/PageMeta";

export default function TermsPage() {
  return (
    <section className="content-page prose">
      <PageMeta title="Terms & Conditions" description="Brew & Bean Coffee terms of service." path="/terms" />
      <h1>Terms &amp; conditions</h1>
      <div className="card checkout-card">
        <p>By using this website you agree to order items for personal use and pay all charges at checkout.</p>
        <p>Prices and availability are subject to change. Final prices are confirmed on the server at checkout.</p>
        <p>We reserve the right to refuse or cancel orders in cases of suspected fraud or unavailability.</p>
      </div>
    </section>
  );
}
