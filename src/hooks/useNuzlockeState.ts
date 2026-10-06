import { useCallback, useEffect, useRef, useState } from "react";
import type { PlayerRun, PokemonEntry, Tournament, TournamentSummary } from "../types/nuzlocke";
import { dexIdFromName } from "../data/pokedex";
import { parseBackup, serializeBackup } from "../lib/backup";
import {
  ApiOffline,
  ApiUnauthorized,
  createTournament as apiCreate,
  deleteTournament as apiDelete,
  getTournament as apiGet,
  listTournaments as apiList,
  saveTournament as apiSave,
} from "../lib/tournamentsApi";

const LOCAL_KEY = "pokemon-z-nuzlocke:v1";
const SCOPE_KEY = "pokemon-z-nuzlocke:scope";
const PASS_KEY = "pokemon-z-nuzlocke:pass";
const cacheKey = (id: string) => `pokemon-z-nuzlocke:t:${id}`;
const MAX_PARTY = 6;
const SAVE_DEBOUNCE_MS = 800;

interface NuzlockeStore {
  players: PlayerRun[];
  activePlayerId: string;
}

export type Scope = { kind: "local" } | { kind: "tournament"; id: string; name: string };

export type SyncStatus =
  | "idle"
  | "loading"
  | "pending"
  | "saving"
  | "saved"
  | "offline"
  | "unauthorized"
  | "error";

export interface SyncState {
  status: SyncStatus;
  error?: string;
  savedAt?: number;
}

export type ActionResult =
  | { ok: true; id?: string }
  | { ok: false; error: string; kind: "unauthorized" | "offline" | "error" };

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

interface CacheEntry {
  players: PlayerRun[];
  activePlayerId: string;
  name: string;
  dirty: boolean;
  cachedAt: string;
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

// Every entry id a player already uses across party, PC and graveyard.
// Optionally ignores one entry (used when re-keying that entry itself).
function allIds(p: PlayerRun, ignoreId?: string): string[] {
  return [...p.party, ...(p.box ?? []), ...p.graveyard]
    .map((e) => e.id)
    .filter((id) => id !== ignoreId);
}

function makePlayer(name: string): PlayerRun {
  const ts = nowIso();
  return {
    playerId: uid(),
    playerName: name,
    party: [],
    graveyard: [],
    box: [],
    createdAt: ts,
    updatedAt: ts,
  };
}

function defaultStore(): NuzlockeStore {
  const player = makePlayer("Player 1");
  return { players: [player], activePlayerId: player.playerId };
}

function lsGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function lsSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage unavailable or over quota */
  }
}
function lsDel(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

// Older saves predate the PC; always hand the store players with a box array.
function normalizePlayers(players: PlayerRun[]): PlayerRun[] {
  // Keep the same array reference when nothing needs changing: the save logic
  // compares references to decide whether the roster is dirty.
  if (players.every((p) => Array.isArray(p.box))) return players;
  return players.map((p) => (Array.isArray(p.box) ? p : { ...p, box: [] }));
}

function loadLocalRun(): NuzlockeStore | null {
  const raw = lsGet(LOCAL_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as NuzlockeStore;
    if (!parsed || !Array.isArray(parsed.players) || parsed.players.length === 0) return null;
    const activePlayerId = parsed.players.some((p) => p.playerId === parsed.activePlayerId)
      ? parsed.activePlayerId
      : parsed.players[0].playerId;
    return { players: normalizePlayers(parsed.players), activePlayerId };
  } catch {
    return null;
  }
}

function readCache(id: string): CacheEntry | null {
  const raw = lsGet(cacheKey(id));
  if (!raw) return null;
  try {
    const p = JSON.parse(raw) as Partial<CacheEntry>;
    if (!p || !Array.isArray(p.players) || typeof p.activePlayerId !== "string") return null;
    return {
      players: p.players as PlayerRun[],
      activePlayerId: p.activePlayerId,
      name: typeof p.name === "string" ? p.name : "Tournament",
      dirty: p.dirty === true,
      cachedAt: typeof p.cachedAt === "string" ? p.cachedAt : new Date(0).toISOString(),
    };
  } catch {
    return null;
  }
}
function writeCache(id: string, entry: CacheEntry): void {
  lsSet(cacheKey(id), JSON.stringify(entry));
}

function summaryOf(t: Tournament): TournamentSummary {
  return {
    id: t.id,
    name: t.name,
    playerCount: t.players.length,
    pokemonCount: t.players.reduce(
      (n, p) => n + p.party.length + (p.box?.length ?? 0) + p.graveyard.length,
      0,
    ),
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

function mapWriteError(e: unknown): ActionResult & { ok: false } {
  if (e instanceof ApiUnauthorized) {
    return { ok: false, error: "A valid edit passphrase is required.", kind: "unauthorized" };
  }
  if (e instanceof ApiOffline) {
    return {
      ok: false,
      error: "The server is unreachable — changes stay on this device for now.",
      kind: "offline",
    };
  }
  return { ok: false, error: e instanceof Error ? e.message : "Something went wrong.", kind: "error" };
}

export function useNuzlockeState() {
  const [store, setStoreState] = useState<NuzlockeStore>(defaultStore);
  const [scope, setScopeState] = useState<Scope>({ kind: "local" });
  const [hydrated, setHydrated] = useState(false);
  const [tournaments, setTournaments] = useState<TournamentSummary[]>([]);
  const [tournamentsLoading, setTournamentsLoading] = useState(false);
  const [online, setOnline] = useState(true);
  const [sync, setSync] = useState<SyncState>({ status: "idle" });
  const [passphrase, setPassphraseState] = useState("");

  const storeRef = useRef(store);
  const scopeRef = useRef(scope);
  const passphraseRef = useRef(passphrase);
  const skipNextSaveRef = useRef(false);
  const lastSyncedPlayersRef = useRef<PlayerRun[] | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef(false);
  const queuedRef = useRef(false);

  useEffect(() => {
    scopeRef.current = scope;
  }, [scope]);

  // setStore keeps storeRef in lock-step so async saves read the latest roster.
  const setStore = useCallback(
    (updater: NuzlockeStore | ((prev: NuzlockeStore) => NuzlockeStore)) => {
      setStoreState((prev) => {
        const next =
          typeof updater === "function"
            ? (updater as (p: NuzlockeStore) => NuzlockeStore)(prev)
            : updater;
        storeRef.current = next;
        return next;
      });
    },
    [],
  );

  const applyLoaded = useCallback(
    (players: PlayerRun[], activePlayerId: string, nextScope: Scope) => {
      skipNextSaveRef.current = true;
      const next = { players: normalizePlayers(players), activePlayerId };
      storeRef.current = next;
      setStoreState(next);
      scopeRef.current = nextScope;
      setScopeState(nextScope);
    },
    [],
  );

  const upsertSummary = useCallback((t: Tournament) => {
    setTournaments((list) => [summaryOf(t), ...list.filter((x) => x.id !== t.id)]);
  }, []);

  const flushSave = useCallback(
    async (id: string, playersOverride?: PlayerRun[]) => {
      if (scopeRef.current.kind !== "tournament" || scopeRef.current.id !== id) return;
      if (inFlightRef.current) {
        queuedRef.current = true;
        return;
      }
      const players = playersOverride ?? storeRef.current.players;
      inFlightRef.current = true;
      setSync({ status: "saving" });
      try {
        const t = await apiSave(id, { players }, passphraseRef.current || undefined);
        lastSyncedPlayersRef.current = players;
        setOnline(true);
        setSync({ status: "saved", savedAt: Date.now() });
        upsertSummary(t);
        writeCache(id, {
          players,
          activePlayerId: storeRef.current.activePlayerId,
          name: scopeRef.current.kind === "tournament" ? scopeRef.current.name : t.name,
          dirty: false,
          cachedAt: nowIso(),
        });
      } catch (e) {
        if (e instanceof ApiUnauthorized) {
          setSync({ status: "unauthorized" });
        } else if (e instanceof ApiOffline) {
          setOnline(false);
          setSync({ status: "offline", error: (e as Error).message });
        } else {
          setSync({ status: "error", error: e instanceof Error ? e.message : "Save failed." });
        }
      } finally {
        inFlightRef.current = false;
        if (queuedRef.current) {
          queuedRef.current = false;
          void flushSave(id);
        }
      }
    },
    [upsertSummary],
  );

  const refreshTournaments = useCallback(async () => {
    setTournamentsLoading(true);
    try {
      const list = await apiList();
      setTournaments(list);
      setOnline(true);
    } catch (e) {
      if (e instanceof ApiOffline) setOnline(false);
    } finally {
      setTournamentsLoading(false);
    }
  }, []);

  const useLocalRun = useCallback(() => {
    const local = loadLocalRun() ?? defaultStore();
    lastSyncedPlayersRef.current = null;
    applyLoaded(local.players, local.activePlayerId, { kind: "local" });
    lsSet(SCOPE_KEY, "local");
    setSync({ status: "idle" });
  }, [applyLoaded]);

  const openTournament = useCallback(
    async (id: string): Promise<ActionResult> => {
      let server: Tournament | null = null;
      let offline = false;
      try {
        server = await apiGet(id);
        setOnline(true);
      } catch (e) {
        if (e instanceof ApiOffline) {
          offline = true;
          setOnline(false);
        } else {
          return {
            ok: false,
            error: e instanceof Error ? e.message : "Could not open that tournament.",
            kind: "error",
          };
        }
      }

      const cache = readCache(id);
      let players: PlayerRun[];
      let activePlayerId: string;
      let name: string;
      let pushCache = false;

      const cacheAheadOfServer =
        !!cache &&
        cache.dirty &&
        (!server || Date.parse(cache.cachedAt) > Date.parse(server.updatedAt));

      if (server && !cacheAheadOfServer) {
        players = server.players;
        activePlayerId =
          cache && server.players.some((p) => p.playerId === cache.activePlayerId)
            ? cache.activePlayerId
            : (server.players[0]?.playerId ?? "");
        name = server.name;
        lastSyncedPlayersRef.current = players;
      } else if (cache) {
        players = cache.players;
        activePlayerId = cache.activePlayerId;
        name = cache.name || server?.name || "Tournament";
        lastSyncedPlayersRef.current = server ? server.players : null;
        pushCache = !!server;
      } else if (server) {
        players = server.players;
        activePlayerId = server.players[0]?.playerId ?? "";
        name = server.name;
        lastSyncedPlayersRef.current = players;
      } else {
        return { ok: false, error: "That tournament isn't available offline yet.", kind: "offline" };
      }

      if (players.length === 0) {
        players = [makePlayer("Player 1")];
        lastSyncedPlayersRef.current = null;
        pushCache = !offline;
      }

      applyLoaded(players, activePlayerId, { kind: "tournament", id, name });
      lsSet(SCOPE_KEY, id);
      writeCache(id, { players, activePlayerId, name, dirty: pushCache, cachedAt: nowIso() });

      if (pushCache) {
        setSync({ status: "pending" });
        void flushSave(id, players);
      } else {
        setSync({ status: offline ? "offline" : "saved" });
      }
      return { ok: true, id };
    },
    [applyLoaded, flushSave],
  );

  const createTournament = useCallback(
    async (name: string, opts: { fromCurrent?: boolean } = {}): Promise<ActionResult> => {
      const trimmed = name.trim();
      if (!trimmed) return { ok: false, error: "Enter a tournament name.", kind: "error" };
      const players =
        opts.fromCurrent && storeRef.current.players.length
          ? storeRef.current.players
          : [makePlayer("Player 1")];
      try {
        const t = await apiCreate(trimmed, {
          players,
          passphrase: passphraseRef.current || undefined,
        });
        upsertSummary(t);
        const loaded = t.players.length ? t.players : [makePlayer("Player 1")];
        lastSyncedPlayersRef.current = t.players.length ? t.players : null;
        applyLoaded(loaded, loaded[0]?.playerId ?? "", {
          kind: "tournament",
          id: t.id,
          name: t.name,
        });
        lsSet(SCOPE_KEY, t.id);
        writeCache(t.id, {
          players: loaded,
          activePlayerId: loaded[0]?.playerId ?? "",
          name: t.name,
          dirty: !t.players.length,
          cachedAt: nowIso(),
        });
        setOnline(true);
        setSync({ status: "saved", savedAt: Date.now() });
        if (!t.players.length) void flushSave(t.id, loaded);
        return { ok: true, id: t.id };
      } catch (e) {
        return mapWriteError(e);
      }
    },
    [applyLoaded, flushSave, upsertSummary],
  );

  const renameTournament = useCallback(
    async (id: string, name: string): Promise<ActionResult> => {
      const trimmed = name.trim();
      if (!trimmed) return { ok: false, error: "Enter a tournament name.", kind: "error" };
      try {
        const t = await apiSave(id, { name: trimmed }, passphraseRef.current || undefined);
        upsertSummary(t);
        if (scopeRef.current.kind === "tournament" && scopeRef.current.id === id) {
          const next: Scope = { kind: "tournament", id, name: t.name };
          scopeRef.current = next;
          setScopeState(next);
        }
        return { ok: true, id };
      } catch (e) {
        return mapWriteError(e);
      }
    },
    [upsertSummary],
  );

  const deleteTournament = useCallback(
    async (id: string): Promise<ActionResult> => {
      try {
        await apiDelete(id, passphraseRef.current || undefined);
        setTournaments((list) => list.filter((x) => x.id !== id));
        lsDel(cacheKey(id));
        if (scopeRef.current.kind === "tournament" && scopeRef.current.id === id) {
          useLocalRun();
        }
        return { ok: true, id };
      } catch (e) {
        return mapWriteError(e);
      }
    },
    [useLocalRun],
  );

  const setPassphrase = useCallback(
    (value: string) => {
      const v = value.trim();
      passphraseRef.current = v;
      setPassphraseState(v);
      if (v) lsSet(PASS_KEY, v);
      else lsDel(PASS_KEY);
      if (v && scopeRef.current.kind === "tournament" && sync.status === "unauthorized") {
        void flushSave(scopeRef.current.id);
      }
    },
    [flushSave, sync.status],
  );

  const retrySync = useCallback(() => {
    if (scopeRef.current.kind === "tournament") void flushSave(scopeRef.current.id);
  }, [flushSave]);

  // --- roster CRUD (unchanged; operates on the active run whatever its scope) ---

  const mutatePlayer = useCallback(
    (playerId: string, fn: (p: PlayerRun) => PlayerRun) => {
      setStore((prev) => ({
        ...prev,
        players: prev.players.map((p) =>
          p.playerId === playerId ? { ...fn(p), updatedAt: nowIso() } : p,
        ),
      }));
    },
    [setStore],
  );

  const addPlayer = useCallback(
    (name: string) => {
      setStore((prev) => {
        const player = makePlayer(name.trim() || `Player ${prev.players.length + 1}`);
        return { players: [...prev.players, player], activePlayerId: player.playerId };
      });
    },
    [setStore],
  );

  const setActivePlayer = useCallback(
    (playerId: string) => {
      setStore((prev) => ({ ...prev, activePlayerId: playerId }));
    },
    [setStore],
  );

  const renamePlayer = useCallback(
    (playerId: string, name: string) => {
      mutatePlayer(playerId, (p) => ({ ...p, playerName: name.trim() || p.playerName }));
    },
    [mutatePlayer],
  );

  const addPokemon = useCallback(
    (playerId: string, input: NewPokemonInput, to: "party" | "box" = "party") => {
      mutatePlayer(playerId, (p) => {
        if (to === "party" && p.party.length >= MAX_PARTY) return p;
        const used = new Set(allIds(p));
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
        return to === "box"
          ? { ...p, box: [...(p.box ?? []), entry] }
          : { ...p, party: [...p.party, entry] };
      });
    },
    [mutatePlayer],
  );

  const updatePokemon = useCallback(
    (playerId: string, entryId: string, patch: PokemonPatch) => {
      mutatePlayer(playerId, (p) => {
        const otherIds = new Set(allIds(p, entryId));
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
        return {
          ...p,
          party: apply(p.party),
          graveyard: apply(p.graveyard),
          box: apply(p.box ?? []),
        };
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

  const revivePokemon = useCallback(
    (playerId: string, entryId: string): boolean => {
      // Same synchronous check as moveToParty (see note there).
      const p = storeRef.current.players.find((x) => x.playerId === playerId);
      const entry = p?.graveyard.find((e) => e.id === entryId);
      if (!p || !entry || p.party.length >= MAX_PARTY) return false;
      const revived: PokemonEntry = { ...entry, status: "alive", deathDetails: undefined };
      mutatePlayer(playerId, (cur) => ({
        ...cur,
        graveyard: cur.graveyard.filter((e) => e.id !== entryId),
        party: [...cur.party, revived],
      }));
      return true;
    },
    [mutatePlayer],
  );

  const removePokemon = useCallback(
    (playerId: string, entryId: string) => {
      mutatePlayer(playerId, (p) => ({
        ...p,
        party: p.party.filter((e) => e.id !== entryId),
        graveyard: p.graveyard.filter((e) => e.id !== entryId),
        box: (p.box ?? []).filter((e) => e.id !== entryId),
      }));
    },
    [mutatePlayer],
  );

  // PC <-> party. Moving into a full party is refused (returns false).
  const moveToBox = useCallback(
    (playerId: string, entryId: string) => {
      mutatePlayer(playerId, (p) => {
        const entry = p.party.find((e) => e.id === entryId);
        if (!entry) return p;
        return {
          ...p,
          party: p.party.filter((e) => e.id !== entryId),
          box: [entry, ...(p.box ?? [])],
        };
      });
    },
    [mutatePlayer],
  );

  const moveToParty = useCallback(
    (playerId: string, entryId: string): boolean => {
      // Decide synchronously from the latest state: the setState updater runs
      // later, so it cannot be used to report success.
      const p = storeRef.current.players.find((x) => x.playerId === playerId);
      const entry = p?.box?.find((e) => e.id === entryId);
      if (!p || !entry || p.party.length >= MAX_PARTY) return false;
      mutatePlayer(playerId, (cur) => ({
        ...cur,
        box: (cur.box ?? []).filter((e) => e.id !== entryId),
        party: [...cur.party, entry],
      }));
      return true;
    },
    [mutatePlayer],
  );

  // --- JSON data interchange (SDD 2.1) ---

  const exportBackup = useCallback(
    (): string => serializeBackup({ players: store.players, activePlayerId: store.activePlayerId }),
    [store],
  );

  const importBackup = useCallback(
    (text: string): { ok: true; players: number } | { ok: false; error: string } => {
      try {
        const restored = parseBackup(text);
        setStore(restored);
        return { ok: true, players: restored.players.length };
      } catch (err) {
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Could not read that file.",
        };
      }
    },
    [setStore],
  );

  // --- persistence: local run to localStorage, tournament to cache + server ---

  useEffect(() => {
    if (!hydrated) return;

    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }

    if (scope.kind === "local") {
      lsSet(LOCAL_KEY, JSON.stringify(store));
      return;
    }

    const { id, name } = scope;
    const playersChanged = store.players !== lastSyncedPlayersRef.current;
    writeCache(id, {
      players: store.players,
      activePlayerId: store.activePlayerId,
      name,
      dirty: playersChanged,
      cachedAt: nowIso(),
    });
    if (!playersChanged) return;

    setSync((s) => (s.status === "unauthorized" ? s : { status: "pending" }));
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => void flushSave(id), SAVE_DEBOUNCE_MS);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [store, scope, hydrated, flushSave]);

  // --- mount: restore last scope, then reconcile with the server ---

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const savedPass = lsGet(PASS_KEY) ?? "";
      if (savedPass) {
        passphraseRef.current = savedPass;
        setPassphraseState(savedPass);
      }

      const pref = lsGet(SCOPE_KEY);
      if (pref && pref !== "local") {
        const cache = readCache(pref);
        if (cache) {
          storeRef.current = {
            players: normalizePlayers(cache.players),
            activePlayerId: cache.activePlayerId,
          };
          setStoreState(storeRef.current);
          scopeRef.current = { kind: "tournament", id: pref, name: cache.name };
          setScopeState(scopeRef.current);
          skipNextSaveRef.current = true;
          setHydrated(true);
        } else {
          setSync({ status: "loading" });
        }
        const res = await openTournament(pref);
        if (cancelled) return;
        if (!res.ok && !cache) useLocalRun();
        setHydrated(true);
      } else {
        const local = loadLocalRun() ?? defaultStore();
        storeRef.current = local;
        setStoreState(local);
        scopeRef.current = { kind: "local" };
        skipNextSaveRef.current = true;
        setHydrated(true);
      }

      void refreshTournaments();
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    moveToBox,
    moveToParty,
    exportBackup,
    importBackup,
    // tournaments / server sync
    scope,
    online,
    sync,
    tournaments,
    tournamentsLoading,
    passphrase,
    setPassphrase,
    refreshTournaments,
    openTournament,
    createTournament,
    renameTournament,
    deleteTournament,
    useLocalRun,
    retrySync,
  };
}
