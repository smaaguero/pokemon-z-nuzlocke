// Tournaments API — permanent, cross-device storage for the Nuzlocke tracker.
//
// Backed by Netlify Blobs (auto-provisioned on deploy, no config needed). One
// blob holds every tournament; each PUT replaces a single tournament entry so
// people editing different tournaments never clobber each other.
//
// Routes (see `config` at the bottom):
//   GET    /api/tournaments        -> { tournaments: TournamentSummary[] }
//   POST   /api/tournaments        -> Tournament            (create)        [auth]
//   GET    /api/tournaments/:id    -> Tournament
//   PUT    /api/tournaments/:id    -> Tournament            (name/players)  [auth]
//   DELETE /api/tournaments/:id    -> 204                                   [auth]
//
// "auth" = if NUZLOCKE_EDIT_PASSPHRASE is set on the deploy, the request must
// send a matching `x-nuzlocke-passphrase` header. If it is unset, writes are open.

import type { Config, Context } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import type { PlayerRun, Tournament, TournamentSummary } from "../../src/types/nuzlocke";
import { parsePlayerRun, str } from "../../src/lib/schema";

const STORE_NAME = "nuzlocke";
const DB_KEY = "db";
const MAX_TOURNAMENTS = 100;
const MAX_PLAYERS = 16;
const MAX_NAME = 80;

interface Db {
  tournaments: Tournament[];
}

export interface BlobLikeStore {
  get(key: string, opts: { type: "json" }): Promise<unknown>;
  setJSON(key: string, value: unknown): Promise<void>;
}

const nowIso = () => new Date().toISOString();

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}
const fail = (status: number, message: string) => json({ error: message }, status);

async function readDb(store: BlobLikeStore): Promise<Db> {
  const raw = await store.get(DB_KEY, { type: "json" });
  if (raw && typeof raw === "object" && Array.isArray((raw as Db).tournaments)) {
    return raw as Db;
  }
  return { tournaments: [] };
}

function summarize(t: Tournament): TournamentSummary {
  return {
    id: t.id,
    name: t.name,
    playerCount: t.players.length,
    pokemonCount: t.players.reduce((n, p) => n + p.party.length + p.graveyard.length, 0),
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

function parseName(v: unknown): string {
  const name = str(v, "name").trim();
  if (!name) throw new Error("A tournament name is required.");
  if (name.length > MAX_NAME) throw new Error(`Name must be ${MAX_NAME} characters or fewer.`);
  return name;
}

function parsePlayers(v: unknown): PlayerRun[] {
  if (!Array.isArray(v)) throw new Error('"players" must be an array.');
  if (v.length > MAX_PLAYERS) throw new Error(`Too many players (max ${MAX_PLAYERS}).`);
  return v.map((p, i) => parsePlayerRun(p, `players[${i}]`));
}

function authorized(req: Request): boolean {
  const required = (process.env.NUZLOCKE_EDIT_PASSPHRASE ?? "").trim();
  if (!required) return true;
  return (req.headers.get("x-nuzlocke-passphrase") ?? "") === required;
}

/** Pure request handler — `store` is injected so it can be unit-tested. */
export async function handle(
  req: Request,
  params: Record<string, string | undefined>,
  store: BlobLikeStore,
): Promise<Response> {
  const id = params.id;
  const method = req.method.toUpperCase();

  try {
    if (method === "GET" && !id) {
      const db = await readDb(store);
      return json({ tournaments: db.tournaments.map(summarize) });
    }

    if (method === "GET" && id) {
      const db = await readDb(store);
      const found = db.tournaments.find((t) => t.id === id);
      return found ? json(found) : fail(404, "Tournament not found.");
    }

    // Everything below mutates.
    if (!authorized(req)) return fail(401, "A valid edit passphrase is required.");

    const body: unknown =
      method === "DELETE" ? {} : await req.json().catch(() => ({}));
    const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;

    if (method === "POST" && !id) {
      const db = await readDb(store);
      if (db.tournaments.length >= MAX_TOURNAMENTS) {
        return fail(409, "Tournament limit reached.");
      }
      const t: Tournament = {
        id: crypto.randomUUID(),
        name: parseName(b.name),
        players: b.players === undefined ? [] : parsePlayers(b.players),
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      db.tournaments.unshift(t);
      await store.setJSON(DB_KEY, db);
      return json(t, 201);
    }

    if (method === "PUT" && id) {
      const db = await readDb(store);
      const idx = db.tournaments.findIndex((t) => t.id === id);
      if (idx === -1) return fail(404, "Tournament not found.");
      const current = db.tournaments[idx];
      const next: Tournament = {
        ...current,
        name: b.name === undefined ? current.name : parseName(b.name),
        players: b.players === undefined ? current.players : parsePlayers(b.players),
        updatedAt: nowIso(),
      };
      db.tournaments[idx] = next;
      await store.setJSON(DB_KEY, db);
      return json(next);
    }

    if (method === "DELETE" && id) {
      const db = await readDb(store);
      const remaining = db.tournaments.filter((t) => t.id !== id);
      if (remaining.length === db.tournaments.length) return fail(404, "Tournament not found.");
      await store.setJSON(DB_KEY, { tournaments: remaining });
      return new Response(null, { status: 204 });
    }

    return fail(405, "Method not allowed.");
  } catch (e) {
    return fail(400, e instanceof Error ? e.message : "Bad request.");
  }
}

export default async (req: Request, context: Context): Promise<Response> => {
  let store: BlobLikeStore;
  try {
    const real = getStore({ name: STORE_NAME, consistency: "strong" });
    store = {
      get: (key, opts) => real.get(key, opts),
      setJSON: async (key, value) => {
        await real.setJSON(key, value);
      },
    };
  } catch {
    return fail(503, "Storage is not configured on this deployment.");
  }
  return handle(req, context.params ?? {}, store);
};

export const config: Config = {
  path: ["/api/tournaments", "/api/tournaments/:id"],
};
