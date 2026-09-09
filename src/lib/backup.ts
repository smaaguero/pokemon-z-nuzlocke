// JSON data interchange (SDD Section 2.1): serialise the full run to a portable
// file and validate an incoming file against the PlayerRun / PokemonEntry
// schema before it is allowed back into localStorage.

import type { PlayerRun, PokemonEntry } from "../types/nuzlocke";

export const BACKUP_FORMAT = "pokemon-z-nuzlocke";
export const BACKUP_VERSION = 1;

export interface RestoredState {
  players: PlayerRun[];
  activePlayerId: string;
}

interface BackupFile extends RestoredState {
  format: string;
  version: number;
  exportedAt: string;
}

export function serializeBackup(state: RestoredState): string {
  const file: BackupFile = {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    players: state.players,
    activePlayerId: state.activePlayerId,
  };
  return JSON.stringify(file, null, 2);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function str(v: unknown, field: string): string {
  if (typeof v !== "string") throw new Error(`"${field}" must be a string`);
  return v;
}

function optStr(v: unknown, field: string): string | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  return str(v, field);
}

function num(v: unknown, field: string): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) throw new Error(`"${field}" must be a number`);
  return n;
}

function strArray(v: unknown, field: string): string[] {
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v)) throw new Error(`"${field}" must be an array`);
  return v.map((x, i) => str(x, `${field}[${i}]`));
}

function parseEntry(v: unknown, path: string): PokemonEntry {
  if (!isRecord(v)) throw new Error(`${path} must be an object`);

  const status: PokemonEntry["status"] = v.status === "fainted" ? "fainted" : "alive";

  let deathDetails: PokemonEntry["deathDetails"];
  if (isRecord(v.deathDetails)) {
    const d = v.deathDetails;
    deathDetails = {
      location: str(d.location, `${path}.deathDetails.location`),
      defeatedBy: optStr(d.defeatedBy, `${path}.deathDetails.defeatedBy`),
      levelAtDeath: num(d.levelAtDeath, `${path}.deathDetails.levelAtDeath`),
      timestamp:
        typeof d.timestamp === "string" ? d.timestamp : new Date().toISOString(),
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

function parsePlayer(v: unknown, path: string): PlayerRun {
  if (!isRecord(v)) throw new Error(`${path} must be an object`);
  if (!Array.isArray(v.party)) throw new Error(`${path}.party must be an array`);
  if (!Array.isArray(v.graveyard)) throw new Error(`${path}.graveyard must be an array`);

  const now = new Date().toISOString();
  return {
    playerId: str(v.playerId, `${path}.playerId`),
    playerName: str(v.playerName, `${path}.playerName`),
    avatarUrl: optStr(v.avatarUrl, `${path}.avatarUrl`),
    party: v.party.map((e, i) => parseEntry(e, `${path}.party[${i}]`)),
    graveyard: v.graveyard.map((e, i) => parseEntry(e, `${path}.graveyard[${i}]`)),
    createdAt: typeof v.createdAt === "string" ? v.createdAt : now,
    updatedAt: typeof v.updatedAt === "string" ? v.updatedAt : now,
  };
}

/**
 * Parse and validate a backup file. Accepts the wrapped export format, a bare
 * `{ players, activePlayerId }` object, or a bare `PlayerRun[]`. Throws an Error
 * with a human-readable message on any schema violation.
 */
export function parseBackup(text: string): RestoredState {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("The file is not valid JSON.");
  }

  let playersRaw: unknown;
  let activeRaw: unknown;
  if (Array.isArray(raw)) {
    playersRaw = raw;
  } else if (isRecord(raw) && Array.isArray(raw.players)) {
    playersRaw = raw.players;
    activeRaw = raw.activePlayerId;
  } else {
    throw new Error('Unrecognised backup — expected a "players" array.');
  }

  const list = playersRaw as unknown[];
  if (list.length === 0) throw new Error("The backup contains no players.");

  const players = list.map((p, i) => parsePlayer(p, `players[${i}]`));

  const ids = new Set(players.map((p) => p.playerId));
  if (ids.size !== players.length) throw new Error("Duplicate playerId values in backup.");

  const activePlayerId =
    typeof activeRaw === "string" && ids.has(activeRaw) ? activeRaw : players[0].playerId;

  return { players, activePlayerId };
}
