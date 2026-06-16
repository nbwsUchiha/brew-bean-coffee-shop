import { Link } from "react-router-dom";
import type { Product } from "../lib/types";
import { effectivePrice, formatMoney } from "../lib/types";
import DrinkImage from "./DrinkImage";

type Props = {
  product: Product;
  onAdd?: (product: Product) => void;
};

export default function ProductCard({ product, onAdd }: Props) {
  const price = effectivePrice(product);
  const onSale = product.sale_price_cents != null && product.sale_price_cents < product.price_cents;
  const outOfStock = product.stock_quantity <= 0;

  return (
    <article className="card menu-card">
      <Link to={`/product/${product.slug}`} className="menu-card-image">
        <DrinkImage name={product.name} src={product.image_url} />
        {product.featured && <span className="badge featured-badge">Featured</span>}
        {outOfStock && <span className="badge sold-out-badge">Out of stock</span>}
      </Link>
      <div className="menu-card-body">
        <p className="eyebrow">{product.categories?.name || "Coffee"}</p>
        <h2>
          <Link to={`/product/${product.slug}`}>{product.name}</Link>
        </h2>
        <p>{product.short_description || product.description}</p>
        <div className="menu-card-footer">
          <p className="price">
            {onSale && <span className="price-was">{formatMoney(product.price_cents)}</span>}
            {formatMoney(price)}
          </p>
          {onAdd ? (
            <button
              className="btn primary"
              type="button"
              disabled={outOfStock}
              onClick={() => onAdd(product)}
            >
              {outOfStock ? "Unavailable" : "Add to cart"}
            </button>
          ) : (
            <Link className="btn primary" to={`/product/${product.slug}`}>
              View
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
