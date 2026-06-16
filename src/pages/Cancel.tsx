import { Link } from "react-router-dom";
import PageMeta from "../components/PageMeta";

export default function CancelPage() {
  return (
    <section className="checkout-page">
      <PageMeta title="Checkout canceled" description="Your checkout was canceled." path="/cancel" />
      <div className="card checkout-card">
        <h1>Checkout canceled</h1>
        <p className="lede">No charge was made. Your cart is still saved.</p>
        <Link className="btn primary" to="/cart">
          Return to cart
        </Link>
        <Link className="text-link" to="/catalog">
          Back to menu
        </Link>
      </div>
    </section>
  );
}
