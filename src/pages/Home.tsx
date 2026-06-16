import { Link } from "react-router-dom";
import { heroImage } from "../data/drinkImages";

const perks = [
  { title: "Roasted daily", text: "Small-batch beans, brewed to order." },
  { title: "Quick pickup", text: "Order ahead and skip the line." },
  { title: "Secure checkout", text: "Pay safely with Stripe." },
];

export default function HomePage() {
  return (
    <>
      <section className="hero" style={{ backgroundImage: `url(${heroImage})` }}>
        <div className="hero-overlay" />
        <div className="hero-content">
          <p className="eyebrow">Neighborhood coffee bar</p>
          <h1>Your morning ritual, ready when you arrive.</h1>
          <p className="lede">
            Order lattes, cold brew, and matcha online. Pay in seconds, pick up at the counter.
          </p>
          <div className="actions">
            <Link className="btn primary" to="/catalog">
              Browse menu
            </Link>
            <Link className="btn ghost" to="/login">
              My account
            </Link>
          </div>
        </div>
      </section>

      <section className="perks">
        {perks.map((p) => (
          <article key={p.title} className="perk-card">
            <h2>{p.title}</h2>
            <p>{p.text}</p>
          </article>
        ))}
      </section>
    </>
  );
}
