import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/apiClient";

type Item = { id: string; name: string; description: string; price_cents: number };

export default function CatalogPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getCatalog()
      .then((rows) => setItems(rows))
      .catch((e) => setError(e.message));
  }, []);

  return (
    <section>
      <h1>Menu</h1>
      {error && <p className="error">{error}</p>}
      <div className="grid">
        {items.map((item) => (
          <article key={item.id} className="card">
            <h2>{item.name}</h2>
            <p>{item.description}</p>
            <p className="price">
              {`$${(item.price_cents / 100).toFixed(2)}`}
              
            </p>
            <Link className="btn primary" to={`/checkout?item=${item.id}`}>Buy</Link>
          </article>
        ))}
        {!items.length && !error && <p>Loading menu…</p>}
      </div>
    </section>
  );
}
