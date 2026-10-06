// Framework-free runtime validation for the PlayerRun / PokemonEntry schema
// (SDD Section 5.1). Shared by the JSON backup feature (src/lib/backup.ts) and
// the tournaments API function (netlify/functions/tournaments.mts), so it must
// not import React, Astro, or anything Node/DOM-specific.

import type { PlayerRun, PokemonEntry } from "../types/nuzlocke";

export function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function str(v: unknown, field: string): string {
  if (typeof v !== "string") throw new Error(`"${field}" must be a string`);
  return v;
}

export function optStr(v: unknown, field: string): string | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  return str(v, field);
}

export function num(v: unknown, field: string): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) throw new Error(`"${field}" must be a number`);
  return n;
}

export function strArray(v: unknown, field: string): string[] {
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v)) throw new Error(`"${field}" must be an array`);
  return v.map((x, i) => str(x, `${field}[${i}]`));
}

export function parsePokemonEntry(v: unknown, path: string): PokemonEntry {
  if (!isRecord(v)) throw new Error(`${path} must be an object`);

  const status: PokemonEntry["status"] = v.status === "fainted" ? "fainted" : "alive";

  let deathDetails: PokemonEntry["deathDetails"];
  if (isRecord(v.deathDetails)) {
    const d = v.deathDetails;
    deathDetails = {
      location: str(d.location, `${path}.deathDetails.location`),
      defeatedBy: optStr(d.defeatedBy, `${path}.deathDetails.defeatedBy`),
      levelAtDeath: num(d.levelAtDeath, `${path}.deathDetails.levelAtDeath`),
      timestamp: typeof d.timestamp === "string" ? d.timestamp : new Date().toISOString(),
    };
  }

  return {
    id: str(v.id, `${path}.id`),
    nickname: str(v.nickname, `${path}.nickname`),
    species: str(v.species, `${path}.species`),
    types: strArray(v.types, `${path}.types`),
    level: num(v.level, `${path}.level`),
    ability: optStr(v.ability, `${path}.ability`),
    item: optStr(v.item, `${path}.item`),
    moves: strArray(v.moves, `${path}.moves`),
    status,
    ...(deathDetails ? { deathDetails } : {}),
  };
}

export function parsePlayerRun(v: unknown, path: string): PlayerRun {
  if (!isRecord(v)) throw new Error(`${path} must be an object`);
  if (!Array.isArray(v.party)) throw new Error(`${path}.party must be an array`);
  if (!Array.isArray(v.graveyard)) throw new Error(`${path}.graveyard must be an array`);
  if (v.box !== undefined && v.box !== null && !Array.isArray(v.box)) {
    throw new Error(`${path}.box must be an array`);
  }

  const now = new Date().toISOString();
  return {
    playerId: str(v.playerId, `${path}.playerId`),
    playerName: str(v.playerName, `${path}.playerName`),
    avatarUrl: optStr(v.avatarUrl, `${path}.avatarUrl`),
    party: v.party.map((e, i) => parsePokemonEntry(e, `${path}.party[${i}]`)),
    graveyard: v.graveyard.map((e, i) => parsePokemonEntry(e, `${path}.graveyard[${i}]`)),
    box: Array.isArray(v.box)
      ? v.box.map((e, i) => parsePokemonEntry(e, `${path}.box[${i}]`))
      : [],
    createdAt: typeof v.createdAt === "string" ? v.createdAt : now,
    updatedAt: typeof v.updatedAt === "string" ? v.updatedAt : now,
  };
}
