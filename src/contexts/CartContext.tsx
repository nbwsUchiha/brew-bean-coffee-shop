import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import type { CartLine } from "../lib/types";

const STORAGE_KEY = "brew-bean-cart";

type CartContextValue = {
  items: CartLine[];
  itemCount: number;
  addItem: (line: CartLine) => void;
  removeItem: (productId: string) => void;
  setQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

function loadCart(): CartLine[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CartLine[]) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartLine[]>(() => loadCart());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = useCallback((line: CartLine) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === line.productId);
      if (existing) {
        return prev.map((i) =>
          i.productId === line.productId
            ? { ...i, quantity: i.quantity + line.quantity, name: line.name ?? i.name, imageUrl: line.imageUrl ?? i.imageUrl }
            : i,
        );
      }
      return [...prev, line];
    });
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }, []);

  const setQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((i) => i.productId !== productId));
      return;
    }
    setItems((prev) => prev.map((i) => (i.productId === productId ? { ...i, quantity } : i)));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const itemCount = useMemo(() => items.reduce((s, i) => s + i.quantity, 0), [items]);

  return (
    <CartContext.Provider value={{ items, itemCount, addItem, removeItem, setQuantity, clearCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
