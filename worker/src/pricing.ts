import type { Env, CartLine, CartTotals, Product } from "./types";

export function effectivePriceCents(product: Product): number {
  if (product.sale_price_cents != null && product.sale_price_cents < product.price_cents) {
    return product.sale_price_cents;
  }
  return product.price_cents;
}

export function priceCart(
  env: Env,
  lines: CartLine[],
  products: Product[],
  fulfillmentMethod: "pickup" | "delivery",
): CartTotals {
  const byId = new Map(products.map((p) => [p.id, p]));
  const priced: CartTotals["lines"] = [];

  for (const line of lines) {
    const product = byId.get(line.productId);
    if (!product || !product.available) {
      throw new Error("Product unavailable: " + line.productId);
    }
    if (line.quantity > product.stock_quantity) {
      throw new Error(`Insufficient stock for ${product.name}`);
    }
    const unitPriceCents = effectivePriceCents(product);
    priced.push({
      productId: product.id,
      name: product.name,
      slug: product.slug,
      quantity: line.quantity,
      unitPriceCents,
      lineTotalCents: unitPriceCents * line.quantity,
    });
  }

  const subtotalCents = priced.reduce((s, l) => s + l.lineTotalCents, 0);
  const taxBps = parseInt(env.TAX_RATE_BPS || "800", 10);
  const taxCents = Math.round((subtotalCents * taxBps) / 10000);
  const pickupFee = parseInt(env.PICKUP_FEE_CENTS || "0", 10);
  const deliveryFee = parseInt(env.DELIVERY_FEE_CENTS || "499", 10);
  const shippingCents = fulfillmentMethod === "delivery" ? deliveryFee : pickupFee;
  const totalCents = subtotalCents + taxCents + shippingCents;

  return { lines: priced, subtotalCents, taxCents, shippingCents, totalCents };
}
