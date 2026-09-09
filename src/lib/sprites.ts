// Sprite resolution.
//
// A PokemonEntry `id` doubles as its National Dex number (per the SDD component
// spec). When a second copy of the same species is caught, the store appends a
// "#2" disambiguation suffix — that is stripped here. Anything that is not a
// bare dex number (e.g. a generated UUID for an unrecognised species) yields no
// URL, and the UI falls back to a monogram.

const DEX_ID = /^(\d+)(?:#\d+)?$/;

export function spriteUrl(entry: { id: string }): string {
  const match = String(entry.id).match(DEX_ID);
  return match ? spriteUrlFromDex(Number(match[1])) : "";
}

export function spriteUrlFromDex(dex: number): string {
  return Number.isFinite(dex) && dex > 0
    ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${dex}.png`
    : "";
}
