import { useState } from "react";
import { imageForDrink } from "../data/drinkImages";

type Props = { name: string; src?: string | null };

export default function DrinkImage({ name, src }: Props) {
  const [failed, setFailed] = useState(false);
  const slug = name.toLowerCase().replace(/\s+/g, "-");
  const imageSrc = src || imageForDrink(name);

  if (failed) {
    return (
      <div className={`menu-card-placeholder placeholder-${slug}`} aria-label={name}>
        <span>{name}</span>
      </div>
    );
  }

  return (
    <img
      src={imageSrc}
      alt={name}
      loading="lazy"
      width={400}
      height={300}
      onError={() => setFailed(true)}
    />
  );
}
