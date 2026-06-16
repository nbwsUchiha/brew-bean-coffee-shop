import { Link } from "react-router-dom";
import PageMeta from "../components/PageMeta";

const faqs = [
  {
    q: "How long does pickup take?",
    a: "Most orders are ready in about 15 minutes. You'll receive an email confirmation after payment.",
  },
  {
    q: "Do you offer delivery?",
    a: "Yes — select local delivery at checkout. Delivery fees and availability are shown before you pay.",
  },
  {
    q: "Can I modify my order after paying?",
    a: "Contact us as soon as possible. Once preparation begins we may not be able to change items.",
  },
  {
    q: "What is your refund policy?",
    a: "See our refunds page for details on incorrect or canceled orders.",
  },
];

export default function FaqPage() {
  return (
    <section className="content-page">
      <PageMeta title="FAQ" description="Frequently asked questions about Brew & Bean Coffee." path="/faq" />
      <header className="section-head">
        <h1>Frequently asked questions</h1>
      </header>
      <div className="faq-list">
        {faqs.map((f) => (
          <details key={f.q} className="card checkout-card">
            <summary>{f.q}</summary>
            <p>{f.a}</p>
          </details>
        ))}
      </div>
      <p>
        Still have questions? <Link to="/contact">Contact us</Link>.
      </p>
    </section>
  );
}
