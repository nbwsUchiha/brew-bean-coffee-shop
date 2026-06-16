import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import DrinkImage from "../components/DrinkImage";
import PageMeta from "../components/PageMeta";
import { api } from "../lib/apiClient";
import { effectivePrice, formatMoney, type Product } from "../lib/types";
import { useCart } from "../contexts/CartContext";

export default function ProductDetailPage() {
  const { slug = "" } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState("");
  const [qty, setQty] = useState(1);
  const { addItem } = useCart();

  useEffect(() => {
    if (!slug) return;
    api
      .getProduct(slug)
      .then(setProduct)
      .catch((e) => setError(e.message));
  }, [slug]);

  const price = product ? effectivePrice(product) : 0;
  const outOfStock = product ? product.stock_quantity <= 0 : false;

  useEffect(() => {
    if (!product) return;
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.name,
      description: product.description,
      image: product.image_url,
      offers: {
        "@type": "Offer",
        priceCurrency: "USD",
        price: (effectivePrice(product) / 100).toFixed(2),
        availability: outOfStock ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
      },
    };
    const el = document.createElement("script");
    el.type = "application/ld+json";
    el.textContent = JSON.stringify(structuredData);
    document.head.appendChild(el);
    return () => {
      document.head.removeChild(el);
    };
  }, [product, outOfStock]);

  if (error) {
    return (
      <section className="checkout-page">
        <p className="error" role="alert">{error}</p>
        <Link to="/catalog">← Back to menu</Link>
      </section>
    );
  }

  if (!product) {
    return <p className="loading-note">Loading product…</p>;
  }

  const onSale = product.sale_price_cents != null && product.sale_price_cents < product.price_cents;

  return (
    <section className="product-detail">
      <PageMeta
        title={product.name}
        description={product.short_description || product.description || product.name}
        path={`/product/${product.slug}`}
        type="product"
        image={product.image_url || undefined}
      />

      <Link className="text-link" to="/catalog">
        ← Back to menu
      </Link>

      <div className="product-detail-grid">
        <div className="product-detail-image card">
          <DrinkImage name={product.name} src={product.image_url} />
        </div>
        <div className="product-detail-info">
          <p className="eyebrow">{product.categories?.name}</p>
          <h1>{product.name}</h1>
          <p className="lede">{product.description}</p>

          <dl className="product-meta">
            {product.origin && (
              <div>
                <dt>Origin</dt>
                <dd>{product.origin}</dd>
              </div>
            )}
            {product.roast_level && (
              <div>
                <dt>Roast</dt>
                <dd>{product.roast_level}</dd>
              </div>
            )}
            {product.size_weight && (
              <div>
                <dt>Size</dt>
                <dd>{product.size_weight}</dd>
              </div>
            )}
            <div>
              <dt>Stock</dt>
              <dd>{outOfStock ? "Out of stock" : `${product.stock_quantity} available`}</dd>
            </div>
          </dl>

          <p className="price price-lg">
            {onSale && <span className="price-was">{formatMoney(product.price_cents)}</span>}
            {formatMoney(price)}
          </p>

          <div className="product-actions">
            <label className="field qty-field">
              <span>Quantity</span>
              <input
                type="number"
                min={1}
                max={product.stock_quantity}
                value={qty}
                onChange={(e) => setQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                disabled={outOfStock}
              />
            </label>
            <button
              className="btn primary"
              type="button"
              disabled={outOfStock || qty > product.stock_quantity}
              onClick={() =>
                addItem({
                  productId: product.id,
                  quantity: qty,
                  name: product.name,
                  imageUrl: product.image_url,
                })
              }
            >
              Add to cart
            </button>
            <Link className="btn ghost" to="/cart">
              View cart
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
