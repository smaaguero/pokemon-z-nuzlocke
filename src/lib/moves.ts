// Move name resolution.
//
// Players type moves by hand, in English or Spanish ("Flamethrower" or
// "Lanzallamas", with or without accents). Everything is reduced to the
// English key used by move-types.ts so the coverage maths only has one table.

import type { PokemonType } from "../data/pokemon-types";
import { DAMAGING_MOVE_TYPES, STATUS_MOVE_KEYS } from "../data/move-types";
import { MOVE_NAMES } from "../data/move-names";

const hasOwn = (obj: object, key: string) => Object.prototype.hasOwnProperty.call(obj, key);

// Like moveKey(), but folds accents first so "Ataque Rápido" -> "ataquerapido".
function normalize(name: string): string {
  return name.toLowerCase().normalize("NFD").replace(/[^a-z0-9]/g, "");
}

const SPANISH_TO_ENGLISH = new Map<string, string>(
  MOVE_NAMES.map(([en, es]) => [normalize(es), normalize(en)]),
);

/** English move key for a name in either language (unknown names pass through). */
export function resolveMoveKey(name: string): string {
  const key = normalize(name);
  if (hasOwn(DAMAGING_MOVE_TYPES, key) || STATUS_MOVE_KEYS.has(key)) return key;
  return SPANISH_TO_ENGLISH.get(key) ?? key;
}

/**
 * The type a move deals damage with, "status" for moves that never add
 * coverage, or null when the name is not recognised (usually a typo).
 */
export function moveDamageType(name: string): PokemonType | "status" | null {
  const key = resolveMoveKey(name);
  if (hasOwn(DAMAGING_MOVE_TYPES, key)) return DAMAGING_MOVE_TYPES[key];
  return STATUS_MOVE_KEYS.has(key) ? "status" : null;
}
