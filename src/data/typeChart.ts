// Standard 18-type effectiveness matrix — Gen 6+ mechanics (Fairy included,
// Ghost/Dark no longer resist each other, Steel no longer resists Ghost/Dark).
//
// Layout matches SDD Section 5.2: TYPE_CHART[attacking][defending] = multiplier.

import { POKEMON_TYPES, type PokemonType } from "./pokemon-types";

export type TypeEffectivenessMap = Record<PokemonType, Record<PokemonType, number>>;

// Only the non-neutral relationships, keyed by attacking type.
type SparseRow = { x2?: PokemonType[]; x05?: PokemonType[]; x0?: PokemonType[] };

const SPARSE: Record<PokemonType, SparseRow> = {
  Normal: { x05: ["Rock", "Steel"], x0: ["Ghost"] },
  Fire: { x2: ["Grass", "Ice", "Bug", "Steel"], x05: ["Fire", "Water", "Rock", "Dragon"] },
  Water: { x2: ["Fire", "Ground", "Rock"], x05: ["Water", "Grass", "Dragon"] },
  Electric: { x2: ["Water", "Flying"], x05: ["Electric", "Grass", "Dragon"], x0: ["Ground"] },
  Grass: {
    x2: ["Water", "Ground", "Rock"],
    x05: ["Fire", "Grass", "Poison", "Flying", "Bug", "Dragon", "Steel"],
  },
  Ice: { x2: ["Grass", "Ground", "Flying", "Dragon"], x05: ["Fire", "Water", "Ice", "Steel"] },
  Fighting: {
    x2: ["Normal", "Ice", "Rock", "Dark", "Steel"],
    x05: ["Poison", "Flying", "Psychic", "Bug", "Fairy"],
    x0: ["Ghost"],
  },
  Poison: { x2: ["Grass", "Fairy"], x05: ["Poison", "Ground", "Rock", "Ghost"], x0: ["Steel"] },
  Ground: {
    x2: ["Fire", "Electric", "Poison", "Rock", "Steel"],
    x05: ["Grass", "Bug"],
    x0: ["Flying"],
  },
  Flying: { x2: ["Grass", "Fighting", "Bug"], x05: ["Electric", "Rock", "Steel"] },
  Psychic: { x2: ["Fighting", "Poison"], x05: ["Psychic", "Steel"], x0: ["Dark"] },
  Bug: {
    x2: ["Grass", "Psychic", "Dark"],
    x05: ["Fire", "Fighting", "Poison", "Flying", "Ghost", "Steel", "Fairy"],
  },
  Rock: { x2: ["Fire", "Ice", "Flying", "Bug"], x05: ["Fighting", "Ground", "Steel"] },
  Ghost: { x2: ["Psychic", "Ghost"], x05: ["Dark"], x0: ["Normal"] },
  Dragon: { x2: ["Dragon"], x05: ["Steel"], x0: ["Fairy"] },
  Dark: { x2: ["Psychic", "Ghost"], x05: ["Fighting", "Dark", "Fairy"] },
  Steel: { x2: ["Ice", "Rock", "Fairy"], x05: ["Fire", "Water", "Electric", "Steel"] },
  Fairy: { x2: ["Fighting", "Dragon", "Dark"], x05: ["Fire", "Poison", "Steel"] },
};

export const TYPE_CHART: TypeEffectivenessMap = (() => {
  const chart = {} as TypeEffectivenessMap;
  for (const atk of POKEMON_TYPES) {
    const row = {} as Record<PokemonType, number>;
    for (const def of POKEMON_TYPES) row[def] = 1;
    const sparse = SPARSE[atk];
    for (const d of sparse.x2 ?? []) row[d] = 2;
    for (const d of sparse.x05 ?? []) row[d] = 0.5;
    for (const d of sparse.x0 ?? []) row[d] = 0;
    chart[atk] = row;
  }
  return chart;
})();

/** Outgoing multiplier of an attacking type against a single defending type. */
export function offensiveMultiplier(attacking: PokemonType, defending: PokemonType): number {
  return TYPE_CHART[attacking][defending];
}

/** Incoming multiplier of an attacking type against a defender's (1–2) types. */
export function defensiveMultiplier(
  attacking: PokemonType,
  defenderTypes: readonly PokemonType[],
): number {
  return defenderTypes.reduce((mult, t) => mult * TYPE_CHART[attacking][t], 1);
}
