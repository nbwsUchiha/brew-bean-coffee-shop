import { Link } from "react-router-dom";

export default function SuccessPage() {
  return (
    <section className="checkout-page">
      <div className="card checkout-card" style={{ textAlign: "center" }}>
        <p className="eyebrow">Order confirmed</p>
        <h1>Thanks — we&apos;re on it!</h1>
        <p className="lede">Your drink will be ready for pickup shortly. Check your email for the receipt.</p>
        <Link className="btn primary btn-block" to="/catalog">
          Order another
        </Link>
      </div>
    </section>
  );
}
