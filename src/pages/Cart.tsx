import { Link } from "react-router-dom";
import PageMeta from "../components/PageMeta";
import { useCart } from "../contexts/CartContext";

export default function CartPage() {
  const { items, setQuantity, removeItem, itemCount } = useCart();

  return (
    <section className="checkout-page">
      <PageMeta title="Cart" description="Review your Brew & Bean cart before checkout." path="/cart" />
      <header className="section-head">
        <p className="eyebrow">Your order</p>
        <h1>Cart</h1>
      </header>

      {itemCount === 0 ? (
        <div className="card checkout-card empty-state">
          <p>Your cart is empty.</p>
          <Link className="btn primary" to="/catalog">
            Browse menu
          </Link>
        </div>
      ) : (
        <div className="card checkout-card">
          <ul className="cart-list">
            {items.map((item) => (
              <li key={item.productId} className="cart-row">
                <div>
                  <strong>{item.name || "Coffee item"}</strong>
                </div>
                <label className="field qty-field inline">
                  <span className="sr-only">Quantity</span>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={item.quantity}
                    onChange={(e) => setQuantity(item.productId, parseInt(e.target.value, 10) || 1)}
                  />
                </label>
                <button className="text-link" type="button" onClick={() => removeItem(item.productId)}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
          <Link className="btn primary btn-block" to="/checkout">
            Proceed to checkout
          </Link>
        </div>
      )}
    </section>
  );
}
