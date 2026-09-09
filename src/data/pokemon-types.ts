// The 18 canonical types (SDD Section 5.2) plus JIT-safe Tailwind chip classes.

export const POKEMON_TYPES = [
  "Normal",
  "Fire",
  "Water",
  "Grass",
  "Electric",
  "Ice",
  "Fighting",
  "Poison",
  "Ground",
  "Flying",
  "Psychic",
  "Bug",
  "Rock",
  "Ghost",
  "Dragon",
  "Steel",
  "Dark",
  "Fairy",
] as const;

export type PokemonType = (typeof POKEMON_TYPES)[number];

// Full class strings so Tailwind can statically detect them.
const TYPE_CHIP: Record<string, string> = {
  Normal: "bg-neutral-400/15 text-neutral-200 border-neutral-400/30",
  Fire: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  Water: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  Grass: "bg-green-500/15 text-green-300 border-green-500/30",
  Electric: "bg-yellow-400/15 text-yellow-300 border-yellow-400/30",
  Ice: "bg-cyan-400/15 text-cyan-200 border-cyan-400/30",
  Fighting: "bg-red-600/15 text-red-300 border-red-600/30",
  Poison: "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30",
  Ground: "bg-amber-600/15 text-amber-300 border-amber-600/30",
  Flying: "bg-sky-400/15 text-sky-200 border-sky-400/30",
  Psychic: "bg-pink-500/15 text-pink-300 border-pink-500/30",
  Bug: "bg-lime-500/15 text-lime-300 border-lime-500/30",
  Rock: "bg-stone-500/15 text-stone-300 border-stone-500/30",
  Ghost: "bg-violet-500/15 text-violet-300 border-violet-500/30",
  Dragon: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
  Steel: "bg-slate-400/15 text-slate-200 border-slate-400/30",
  Dark: "bg-neutral-700/40 text-neutral-200 border-neutral-600/50",
  Fairy: "bg-rose-400/15 text-rose-200 border-rose-400/30",
};

export function typeChipClass(type: string): string {
  return TYPE_CHIP[type] ?? "bg-zinc-700/30 text-zinc-300 border-zinc-600/40";
}
