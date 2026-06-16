import { useEffect, useMemo, useState } from "react";
import PageMeta from "../components/PageMeta";
import ProductCard from "../components/ProductCard";
import { api } from "../lib/apiClient";
import type { Category, Product } from "../lib/types";
import { useCart } from "../contexts/CartContext";

const SORT_OPTIONS = [
  { value: "featured", label: "Featured" },
  { value: "name", label: "Name" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
];

export default function CatalogPage() {
  const [items, setItems] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("featured");
  const { addItem } = useCart();

  useEffect(() => {
    api.getCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    setError("");
    api
      .getProducts({ q: q || undefined, category: category || undefined, sort })
      .then((rows) => setItems(rows))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [q, category, sort]);

  const empty = useMemo(() => !loading && !error && items.length === 0, [loading, error, items]);

  return (
    <section className="catalog-page">
      <PageMeta
        title="Menu"
        description="Browse our full coffee menu — espresso drinks, cold brew, and specialty lattes."
        path="/catalog"
      />
      <header className="section-head">
        <p className="eyebrow">Today&apos;s menu</p>
        <h1>Drinks made to order</h1>
        <p className="lede">Add items to your cart — pickup available within ~15 minutes.</p>
      </header>

      <div className="catalog-toolbar card">
        <label className="field grow">
          <span className="sr-only">Search menu</span>
          <input
            type="search"
            placeholder="Search drinks…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search menu"
          />
        </label>
        <label className="field">
          <span>Category</span>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All</option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Sort</span>
          <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort products">
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && <p className="error" role="alert">{error}</p>}
      {loading && <p className="loading-note">Brewing the menu…</p>}
      {empty && <p className="empty-state">No drinks match your search. Try another filter.</p>}

      <div className="grid menu-grid">
        {items.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onAdd={(p) =>
              addItem({
                productId: p.id,
                quantity: 1,
                name: p.name,
                imageUrl: p.image_url,
              })
            }
          />
        ))}
      </div>
    </section>
  );
}
