import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageMeta from "../components/PageMeta";
import { AdminRoute } from "../components/ProtectedRoute";
import { api } from "../lib/apiClient";
import { formatMoney, type Category, type Order, type Product } from "../lib/types";

function AdminDashboard() {
  const [stats, setStats] = useState<{ revenueCents: number; paidOrderCount: number; activeOrders: number } | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tab, setTab] = useState<"overview" | "products" | "orders">("overview");
  const [error, setError] = useState("");
  const [productForm, setProductForm] = useState({
    name: "",
    slug: "",
    priceCents: 500,
    stockQuantity: 10,
    categoryId: "",
  });

  const load = async () => {
    try {
      const [s, p, o, c] = await Promise.all([
        api.adminStats(),
        api.adminProducts(),
        api.adminOrders(),
        api.adminCategories(),
      ]);
      setStats(s);
      setProducts(p);
      setOrders(o);
      setCategories(c);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load admin data");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const createProduct = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await api.adminCreateProduct({
        name: productForm.name,
        slug: productForm.slug || productForm.name.toLowerCase().replace(/\s+/g, "-"),
        priceCents: productForm.priceCents,
        stockQuantity: productForm.stockQuantity,
        categoryId: productForm.categoryId || null,
        available: true,
        featured: false,
      });
      setProductForm({ name: "", slug: "", priceCents: 500, stockQuantity: 10, categoryId: "" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    }
  };

  const updateOrderStatus = async (id: string, orderStatus: string) => {
    await api.adminUpdateOrderStatus(id, orderStatus);
    await load();
  };

  return (
    <section className="admin-page">
      <PageMeta title="Admin" description="Brew & Bean admin dashboard." path="/admin" />
      <header className="section-head">
        <p className="eyebrow">Staff only</p>
        <h1>Admin dashboard</h1>
        <Link className="text-link" to="/account">
          ← Account
        </Link>
      </header>

      <nav className="admin-tabs" aria-label="Admin sections">
        {(["overview", "products", "orders"] as const).map((t) => (
          <button key={t} type="button" className={tab === t ? "active" : ""} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </nav>

      {error && <p className="error" role="alert">{error}</p>}

      {tab === "overview" && stats && (
        <div className="perks">
          <article className="perk-card">
            <h2>{formatMoney(stats.revenueCents)}</h2>
            <p>Total revenue (paid)</p>
          </article>
          <article className="perk-card">
            <h2>{stats.paidOrderCount}</h2>
            <p>Paid orders</p>
          </article>
          <article className="perk-card">
            <h2>{stats.activeOrders}</h2>
            <p>Active orders</p>
          </article>
        </div>
      )}

      {tab === "products" && (
        <>
          <form onSubmit={createProduct} className="card checkout-card">
            <h2>Add product</h2>
            <label className="field">
              <span>Name</span>
              <input required value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} />
            </label>
            <label className="field">
              <span>Slug</span>
              <input value={productForm.slug} onChange={(e) => setProductForm({ ...productForm, slug: e.target.value })} placeholder="auto-generated" />
            </label>
            <label className="field">
              <span>Price (cents)</span>
              <input type="number" required value={productForm.priceCents} onChange={(e) => setProductForm({ ...productForm, priceCents: parseInt(e.target.value, 10) })} />
            </label>
            <label className="field">
              <span>Stock</span>
              <input type="number" required value={productForm.stockQuantity} onChange={(e) => setProductForm({ ...productForm, stockQuantity: parseInt(e.target.value, 10) })} />
            </label>
            <label className="field">
              <span>Category</span>
              <select value={productForm.categoryId} onChange={(e) => setProductForm({ ...productForm, categoryId: e.target.value })}>
                <option value="">None</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <button className="btn primary" type="submit">
              Create product
            </button>
          </form>

          <ul className="admin-table card checkout-card">
            {products.map((p) => (
              <li key={p.id}>
                <strong>{p.name}</strong> — {formatMoney(p.price_cents)} — stock {p.stock_quantity}
                <button className="text-link" type="button" onClick={() => api.adminDeleteProduct(p.id).then(load)}>
                  Archive
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {tab === "orders" && (
        <ul className="admin-table card checkout-card">
          {orders.map((o) => (
            <li key={o.id}>
              <div>
                <strong>{o.order_number}</strong> — {o.customer_email} — {formatMoney(o.total_cents || o.amount_cents)} —{" "}
                {o.order_status}
              </div>
              <select
                aria-label={`Update status for ${o.order_number}`}
                value={o.order_status}
                onChange={(e) => updateOrderStatus(o.id, e.target.value)}
              >
                {["pending", "paid", "preparing", "ready", "shipped", "completed", "cancelled", "refunded"].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function AdminPage() {
  return (
    <AdminRoute>
      <AdminDashboard />
    </AdminRoute>
  );
}
