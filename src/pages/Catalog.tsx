import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/apiClient";
import DrinkImage from "../components/DrinkImage";

type Item = { id: string; name: string; description: string; price_cents: number };

export default function CatalogPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .getCatalog()
      .then((rows) => setItems(rows))
      .catch((e) => setError(e.message));
  }, []);

  return (
    <section className="catalog-page">
      <header className="section-head">
        <p className="eyebrow">Today&apos;s menu</p>
        <h1>Drinks made to order</h1>
        <p className="lede">Tap a drink to checkout — pickup available within 15 minutes.</p>
      </header>

      {error && <p className="error">{error}</p>}

      <div className="grid menu-grid">
        {items.map((item) => (
          <article key={item.id} className="card menu-card">
            <div className="menu-card-image">
              <DrinkImage name={item.name} />
            </div>
            <div className="menu-card-body">
              <h2>{item.name}</h2>
              <p>{item.description}</p>
              <div className="menu-card-footer">
                <p className="price">{`$${(item.price_cents / 100).toFixed(2)}`}</p>
                <Link className="btn primary" to={`/checkout?item=${item.id}`}>
                  Add to order
                </Link>
              </div>
            </div>
          </article>
        ))}
        {!items.length && !error && <p className="loading-note">Brewing the menu…</p>}
      </div>
    </section>
  );
}
