/** Realistic drink photos — hosted locally so they always load on Pages */
export const drinkImages: Record<string, string> = {
  "House Latte": "/drinks/house-latte.jpg",
  "Cold Brew": "/drinks/cold-brew.jpg",
  "Matcha Oat Latte": "/drinks/matcha-oat-latte.jpg",
};

export const heroImage =
  "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1600&q=80";

export function imageForDrink(name: string): string {
  return drinkImages[name] ?? "/drinks/house-latte.jpg";
}
