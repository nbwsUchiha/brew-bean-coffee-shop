import { useState } from "react";
import { imageForDrink } from "../data/drinkImages";

type Props = { name: string };

export default function DrinkImage({ name }: Props) {
  const [failed, setFailed] = useState(false);
  const slug = name.toLowerCase().replace(/\s+/g, "-");

  if (failed) {
    return (
      <div className={`menu-card-placeholder placeholder-${slug}`} aria-label={name}>
        <span>{name}</span>
      </div>
    );
  }

  return (
    <img
      src={imageForDrink(name)}
      alt={name}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}
