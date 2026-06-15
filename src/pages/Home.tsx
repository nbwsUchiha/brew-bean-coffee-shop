import { Link } from "react-router-dom";

export default function HomePage() {
  return (
    <section className="hero">
      <p className="eyebrow">Brew & Bean Coffee</p>
      <h1>Order your favorite drinks online for pickup.</h1>
      <p className="lede">
        Built with Vite, Cloudflare Workers, Supabase, and Stripe. Configure secrets in
        <code>.env.local</code> then deploy via GitHub Actions.
      </p>
      <div className="actions">
        <Link className="btn primary" to="/catalog">Order now</Link>
        <Link className="btn ghost" to="/login">Sign in</Link>
      </div>
    </section>
  );
}
