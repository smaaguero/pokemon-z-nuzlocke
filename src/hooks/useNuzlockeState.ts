import { useCallback, useEffect, useState } from "react";
import type { PlayerRun, PokemonEntry } from "../types/nuzlocke";
import { dexIdFromName } from "../data/pokedex";
import { parseBackup, serializeBackup } from "../lib/backup";

export type ImportResult = { ok: true; players: number } | { ok: false; error: string };

const STORAGE_KEY = "pokemon-z-nuzlocke:v1";
const MAX_PARTY = 6;

interface NuzlockeStore {
  players: PlayerRun[];
  activePlayerId: string;
}

export interface NewPokemonInput {
  id: string;
  nickname: string;
  species: string;
  types: string[];
  level: number;
  ability?: string;
  item?: string;
  moves: string[];
}

export interface PokemonPatch {
  id?: string;
  nickname?: string;
  species?: string;
  types?: string[];
  level?: number;
  ability?: string;
  item?: string;
  moves?: string[];
}

export interface DeathInput {
  location: string;
  defeatedBy?: string;
  levelAtDeath: number;
}

function nowIso(): string {
  return new Date().toISOString();
}

function uid(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }
}

function clampLevel(n: number): number {
  const v = Math.round(Number(n));
  if (!Number.isFinite(v)) return 1;
  return Math.min(100, Math.max(1, v));
}

// An entry id doubles as its Dex number; drop the "#2" copy suffix.
function dexOf(id: string): string {
  return id.replace(/#\d+$/, "");
}

// Keep entry ids unique within a run without losing the Dex number that the
// sprite lookup depends on ("104" -> "104#2" -> "104#3").
function uniqueId(base: string, taken: Set<string>): string {
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}#${n}`)) n += 1;
  return `${base}#${n}`;
}

// Resolve the id to store for an encounter: an explicit Dex number wins, then
// the species name, and finally an opaque UUID (no sprite, monogram fallback).
function resolveEntryId(explicitId: string, species: string): string {
  const typed = explicitId.trim();
  if (typed) return typed;
  const fromName = dexIdFromName(species);
  return fromName != null ? String(fromName) : uid();
}

function makePlayer(name: string): PlayerRun {
  const ts = nowIso();
  return {
    playerId: uid(),
    playerName: name,
    party: [],
    graveyard: [],
    createdAt: ts,
    updatedAt: ts,
  };
}

function defaultStore(): NuzlockeStore {
  const player = makePlayer("Player 1");
  return { players: [player], activePlayerId: player.playerId };
}

function loadStore(): NuzlockeStore | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as NuzlockeStore;
    if (!parsed || !Array.isArray(parsed.players) || parsed.players.length === 0) {
      return null;
    }
    const activePlayerId = parsed.players.some((p) => p.playerId === parsed.activePlayerId)
      ? parsed.activePlayerId
      : parsed.players[0].playerId;
    return { players: parsed.players, activePlayerId };
  } catch {
    return null;
  }
}

export function useNuzlockeState() {
  const [store, setStore] = useState<NuzlockeStore>(defaultStore);
  const [hydrated, setHydrated] = useState(false);

  // Load once, client-side only, to avoid an SSR/CSR hydration mismatch.
  useEffect(() => {
    const loaded = loadStore();
    if (loaded) setStore(loaded);
    setHydrated(true);
  }, []);

  // Persist every change after the initial load.
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    } catch {
      /* storage unavailable or over quota — keep working from memory */
    }
  }, [store, hydrated]);

  const mutatePlayer = useCallback(
    (playerId: string, fn: (p: PlayerRun) => PlayerRun) => {
      setStore((prev) => ({
        ...prev,
        players: prev.players.map((p) =>
          p.playerId === playerId ? { ...fn(p), updatedAt: nowIso() } : p,
        ),
      }));
    },
    [],
  );

  const addPlayer = useCallback((name: string) => {
    setStore((prev) => {
      const player = makePlayer(name.trim() || `Player ${prev.players.length + 1}`);
      return { players: [...prev.players, player], activePlayerId: player.playerId };
    });
  }, []);

  const setActivePlayer = useCallback((playerId: string) => {
    setStore((prev) => ({ ...prev, activePlayerId: playerId }));
  }, []);

  const renamePlayer = useCallback(
    (playerId: string, name: string) => {
      mutatePlayer(playerId, (p) => ({ ...p, playerName: name.trim() || p.playerName }));
    },
    [mutatePlayer],
  );

  const addPokemon = useCallback(
    (playerId: string, input: NewPokemonInput) => {
      mutatePlayer(playerId, (p) => {
        if (p.party.length >= MAX_PARTY) return p;
        const used = new Set([...p.party, ...p.graveyard].map((e) => e.id));
        const species = input.species.trim();
        const id = uniqueId(resolveEntryId(input.id, species), used);
        const entry: PokemonEntry = {
          id,
          nickname: input.nickname.trim() || species,
          species,
          types: input.types.slice(0, 2),
          level: clampLevel(input.level),
          ability: input.ability?.trim() || undefined,
          item: input.item?.trim() || undefined,
          moves: input.moves.map((m) => m.trim()).filter(Boolean).slice(0, 4),
          status: "alive",
        };
        return { ...p, party: [...p.party, entry] };
      });
    },
    [mutatePlayer],
  );

  const updatePokemon = useCallback(
    (playerId: string, entryId: string, patch: PokemonPatch) => {
      mutatePlayer(playerId, (p) => {
        const otherIds = new Set(
          [...p.party, ...p.graveyard].filter((e) => e.id !== entryId).map((e) => e.id),
        );
        const apply = (list: PokemonEntry[]) =>
          list.map((e) => {
            if (e.id !== entryId) return e;
            const species =
              patch.species !== undefined ? patch.species.trim() || e.species : e.species;
            // Re-key when the Dex number changes (typed number, or newly
            // recognised species) so the sprite tracks the entry. Never re-key
            // to a fresh UUID: an unresolvable edit keeps the current id.
            let id = e.id;
            if (patch.id !== undefined) {
              const typed = patch.id.trim();
              const fromName = dexIdFromName(species);
              const wanted = typed || (fromName != null ? String(fromName) : "");
              if (wanted && dexOf(wanted) !== dexOf(e.id)) {
                id = uniqueId(wanted, otherIds);
              }
            }
            return {
              ...e,
              id,
              species,
              nickname:
                patch.nickname !== undefined ? patch.nickname.trim() || species : e.nickname,
              types: patch.types ? patch.types.slice(0, 2) : e.types,
              level: patch.level !== undefined ? clampLevel(patch.level) : e.level,
              ability:
                patch.ability !== undefined ? patch.ability.trim() || undefined : e.ability,
              item: patch.item !== undefined ? patch.item.trim() || undefined : e.item,
              moves: patch.moves
                ? patch.moves.map((m) => m.trim()).filter(Boolean).slice(0, 4)
                : e.moves,
            };
          });
        return { ...p, party: apply(p.party), graveyard: apply(p.graveyard) };
      });
    },
    [mutatePlayer],
  );

  const moveToGraveyard = useCallback(
    (playerId: string, entryId: string, death: DeathInput) => {
      mutatePlayer(playerId, (p) => {
        const entry = p.party.find((e) => e.id === entryId);
        if (!entry) return p;
        const fallen: PokemonEntry = {
          ...entry,
          status: "fainted",
          deathDetails: {
            location: death.location.trim() || "Unknown",
            defeatedBy: death.defeatedBy?.trim() || undefined,
            levelAtDeath: clampLevel(death.levelAtDeath),
            timestamp: nowIso(),
          },
        };
        return {
          ...p,
          party: p.party.filter((e) => e.id !== entryId),
          graveyard: [fallen, ...p.graveyard],
        };
      });
    },
    [mutatePlayer],
  );

  // Undo a misclick: bring a fainted Pokémon back to the party. Returns false
  // when the party is already full.
  const revivePokemon = useCallback(
    (playerId: string, entryId: string): boolean => {
      let ok = false;
      mutatePlayer(playerId, (p) => {
        const entry = p.graveyard.find((e) => e.id === entryId);
        if (!entry || p.party.length >= MAX_PARTY) return p;
        ok = true;
        const revived: PokemonEntry = { ...entry, status: "alive", deathDetails: undefined };
        return {
          ...p,
          graveyard: p.graveyard.filter((e) => e.id !== entryId),
          party: [...p.party, revived],
        };
      });
      return ok;
    },
    [mutatePlayer],
  );

  const removePokemon = useCallback(
    (playerId: string, entryId: string) => {
      mutatePlayer(playerId, (p) => ({
        ...p,
        party: p.party.filter((e) => e.id !== entryId),
        graveyard: p.graveyard.filter((e) => e.id !== entryId),
      }));
    },
    [mutatePlayer],
  );

  // --- JSON data interchange (SDD 2.1) ---

  const exportBackup = useCallback(
    (): string => serializeBackup({ players: store.players, activePlayerId: store.activePlayerId }),
    [store],
  );

  const importBackup = useCallback((text: string): ImportResult => {
    try {
      const restored = parseBackup(text);
      setStore(restored); // persist effect writes it straight to localStorage
      return { ok: true, players: restored.players.length };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Could not read that file." };
    }
  }, []);

  const activePlayer =
    store.players.find((p) => p.playerId === store.activePlayerId) ?? store.players[0];

  return {
    hydrated,
    players: store.players,
    activePlayerId: store.activePlayerId,
    activePlayer,
    maxParty: MAX_PARTY,
    addPlayer,
    setActivePlayer,
    renamePlayer,
    addPokemon,
    updatePokemon,
    moveToGraveyard,
    revivePokemon,
    removePokemon,
    exportBackup,
    importBackup,
  };
}
