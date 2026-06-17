import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageMeta from "../components/PageMeta";
import ProductCard from "../components/ProductCard";
import { heroImage } from "../data/drinkImages";
import { api } from "../lib/apiClient";
import type { SiteStats } from "../lib/types";
import { useCart } from "../contexts/CartContext";

function formatRelativeTime(iso: string | null): string {
  if (!iso) return "Be the first to order today";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "Last order just now";
  if (mins < 60) return `Last order ${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `Last order ${hrs} hr ago`;
  return `Last order on ${new Date(iso).toLocaleDateString()}`;
}

function perksFromStats(stats: SiteStats | null) {
  if (!stats) {
    return [
      { title: "Loading menu…", text: "Fetching live store info." },
      { title: "Loading orders…", text: "Checking recent activity." },
      { title: "Estimating pickup…", text: "Checking the current queue." },
    ];
  }

  const menuDetail =
    stats.featuredCount > 0 && stats.categoryCount > 0
      ? `${stats.featuredCount} featured · ${stats.categoryCount} categories`
      : stats.categoryCount > 0
        ? `Across ${stats.categoryCount} categories`
        : "Freshly brewed options available to order now";

  const ordersDetail =
    stats.ordersToday > 0
      ? `${stats.ordersToday} order${stats.ordersToday === 1 ? "" : "s"} today · ${formatRelativeTime(stats.lastOrderAt)}`
      : formatRelativeTime(stats.lastOrderAt);

  const pickupDetail =
    stats.queueAhead > 0
      ? `${stats.queueAhead} drink${stats.queueAhead === 1 ? "" : "s"} ahead in the queue right now`
      : "No queue right now — order ahead and skip the line";

  return [
    {
      title: `${stats.menuCount} drink${stats.menuCount === 1 ? "" : "s"} on the menu`,
      text:
        stats.lowStockCount > 0
          ? `${menuDetail} · ${stats.lowStockCount} running low`
          : menuDetail,
    },
    {
      title: `${stats.ordersFulfilled} order${stats.ordersFulfilled === 1 ? "" : "s"} fulfilled`,
      text: ordersDetail,
    },
    {
      title: `Pickup in ~${stats.pickupMinutes} min`,
      text: pickupDetail,
    },
  ];
}

export default function HomePage() {
  const [stats, setStats] = useState<SiteStats | null>(null);
  const [featured, setFeatured] = useState<import("../lib/types").Product[]>([]);
  const { addItem } = useCart();

  useEffect(() => {
    api.getStats().then(setStats).catch(() => setStats(null));
    api.getProducts({ featured: true }).then(setFeatured).catch(() => setFeatured([]));
  }, []);

  const perks = useMemo(() => perksFromStats(stats), [stats]);

  return (
    <>
      <PageMeta
        title="Brew & Bean Coffee"
        description="Order artisan coffee online for quick pickup or local delivery. Lattes, cold brew, matcha, and more."
        path="/"
      />
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
            <Link className="btn ghost" to="/account">
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

      {featured.length > 0 && (
        <section className="catalog-page">
          <header className="section-head">
            <p className="eyebrow">Featured</p>
            <h2>Customer favorites</h2>
          </header>
          <div className="grid menu-grid">
            {featured.slice(0, 3).map((product) => (
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
      )}
    </>
  );
}
