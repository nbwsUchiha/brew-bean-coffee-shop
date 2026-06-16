import { Link } from "react-router-dom";
import { useCart } from "../contexts/CartContext";

export default function Layout() {
  const { itemCount } = useCart();

  return (
    <>
      <Link className="cart-pill" to="/cart" aria-label={`Cart with ${itemCount} items`}>
        Cart{itemCount > 0 ? ` (${itemCount})` : ""}
      </Link>
    </>
  );
}
