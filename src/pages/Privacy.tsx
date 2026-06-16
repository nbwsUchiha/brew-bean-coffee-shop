import PageMeta from "../components/PageMeta";

export default function PrivacyPage() {
  return (
    <section className="content-page prose">
      <PageMeta title="Privacy Policy" description="Brew & Bean Coffee privacy policy." path="/privacy" />
      <h1>Privacy policy</h1>
      <div className="card checkout-card">
        <p>We collect account and order information to fulfill your purchases and communicate about your orders.</p>
        <p>Payment processing is handled by Stripe. We do not store full card numbers on our servers.</p>
        <p>Contact form submissions are stored securely and used only to respond to your inquiry.</p>
        <p>For privacy requests, contact us via the contact page.</p>
      </div>
    </section>
  );
}
