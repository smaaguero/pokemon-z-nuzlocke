// JSON data interchange (SDD Section 2.1): serialise the full run to a portable
// file and validate an incoming file against the PlayerRun / PokemonEntry
// schema before it is allowed back into localStorage.

import type { PlayerRun } from "../types/nuzlocke";
import { isRecord, parsePlayerRun } from "./schema";

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

  const players = list.map((p, i) => parsePlayerRun(p, `players[${i}]`));

  const ids = new Set(players.map((p) => p.playerId));
  if (ids.size !== players.length) throw new Error("Duplicate playerId values in backup.");

  const activePlayerId =
    typeof activeRaw === "string" && ids.has(activeRaw) ? activeRaw : players[0].playerId;

  return { players, activePlayerId };
}
