import { useState } from "react";
import type { PokemonEntry } from "../../types/nuzlocke";
import { spriteUrl } from "../../lib/sprites";

interface Props {
  entry: Pick<PokemonEntry, "id" | "nickname" | "species">;
  className?: string;
  grayscale?: boolean;
}

export function SpriteImg({ entry, className = "size-14", grayscale = false }: Props) {
  const [broken, setBroken] = useState(false);
  const url = spriteUrl(entry);
  const monogram = (entry.nickname || entry.species || "?").slice(0, 1).toUpperCase();

  if (broken || !url) {
    return (
      <div
        className={`grid place-items-center rounded-lg bg-zinc-800 text-sm font-bold text-zinc-500 ${className} ${
          grayscale ? "opacity-60" : ""
        }`}
      >
        {monogram}
      </div>
    );
  }

  return (
    <img
      src={url}
      alt=""
      loading="lazy"
      onError={() => setBroken(true)}
      className={`object-contain [image-rendering:pixelated] ${className} ${
        grayscale ? "grayscale opacity-60" : ""
      }`}
    />
  );
}
