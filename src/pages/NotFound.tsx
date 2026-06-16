import { Link } from "react-router-dom";
import PageMeta from "../components/PageMeta";

export default function NotFoundPage() {
  return (
    <section className="content-page">
      <PageMeta title="Page not found" description="The page you requested could not be found." path="/404" />
      <div className="card checkout-card empty-state">
        <h1>404 — Page not found</h1>
        <p>That page may have moved or doesn&apos;t exist.</p>
        <Link className="btn primary" to="/">
          Go home
        </Link>
      </div>
    </section>
  );
}
