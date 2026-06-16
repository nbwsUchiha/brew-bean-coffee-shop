import { z } from "zod";

export const cartLineSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1).max(99),
});

export const checkoutSchema = z.object({
  items: z.array(cartLineSchema).min(1).max(20),
  email: z.string().email(),
  customerName: z.string().min(1).max(120).optional(),
  fulfillmentMethod: z.enum(["pickup", "delivery"]).default("pickup"),
});

export const contactSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  subject: z.string().max(200).optional(),
  message: z.string().min(10).max(5000),
});

export const profileUpdateSchema = z.object({
  fullName: z.string().max(120).optional(),
  phone: z.string().max(30).optional(),
  addressLine1: z.string().max(200).optional(),
  addressLine2: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(50).optional(),
  postalCode: z.string().max(20).optional(),
});

export const productSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/),
  description: z.string().max(5000).optional(),
  shortDescription: z.string().max(300).optional(),
  categoryId: z.string().uuid().nullable().optional(),
  priceCents: z.number().int().min(0),
  salePriceCents: z.number().int().min(0).nullable().optional(),
  imageUrl: z.string().max(2000).optional(),
  stockQuantity: z.number().int().min(0),
  available: z.boolean(),
  featured: z.boolean(),
  origin: z.string().max(100).optional(),
  roastLevel: z.string().max(50).optional(),
  sizeWeight: z.string().max(50).optional(),
});

export const categorySchema = z.object({
  name: z.string().min(1).max(120),
  slug: z.string().min(1).max(120).regex(/^[a-z0-9-]+$/),
  description: z.string().max(1000).optional(),
});

export const orderStatusSchema = z.object({
  orderStatus: z.enum([
    "pending",
    "paid",
    "preparing",
    "ready",
    "shipped",
    "completed",
    "cancelled",
    "refunded",
  ]),
  note: z.string().max(500).optional(),
});

export const adminSetupSchema = z.object({
  email: z.string().email(),
  secret: z.string().min(8),
});

export function parseBody<T>(schema: z.ZodSchema<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    const msg = result.error.errors.map((e) => e.message).join("; ");
    throw new ValidationError(msg);
  }
  return result.data;
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}
