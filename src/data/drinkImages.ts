/** Product image paths — original SVG illustrations in /public/drinks */
export const drinkImages: Record<string, string> = {
  "House Latte": "/drinks/house-latte.svg",
  "Cold Brew": "/drinks/cold-brew.svg",
  "Matcha Oat Latte": "/drinks/matcha-oat-latte.svg",
  Cappuccino: "/drinks/cappuccino.svg",
  "Iced Americano": "/drinks/iced-americano.svg",
  "Vanilla Oat Latte": "/drinks/vanilla-oat-latte.svg",
};

export const heroImage = "/drinks/hero-coffee.svg";

export function imageForDrink(name: string): string {
  return drinkImages[name] ?? "/drinks/house-latte.svg";
}
