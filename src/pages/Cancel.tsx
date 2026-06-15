import { Link } from "react-router-dom";

export default function CancelPage() {
  return (
    <section>
      <h1>Checkout canceled</h1>
      <p>No charge was made.</p>
      <Link className="btn primary" to="/catalog">Back to menu</Link>
    </section>
  );
}
