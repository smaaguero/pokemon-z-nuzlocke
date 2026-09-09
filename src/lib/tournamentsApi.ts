// Browser-side client for the /api/tournaments function.
//
// Error taxonomy the UI cares about:
//   ApiOffline       - server unreachable or storage not configured -> local-only mode
//   ApiUnauthorized  - a valid edit passphrase is required
//   ApiError         - any other 4xx/5xx (message is safe to show)

import type { PlayerRun, Tournament, TournamentSummary } from "../types/nuzlocke";

const BASE = "/api/tournaments";

export class ApiOffline extends Error {}
export class ApiUnauthorized extends Error {}
export class ApiError extends Error {}

interface Options {
  method?: string;
  body?: unknown;
  passphrase?: string;
}

async function request<T>(path: string, opts: Options = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (opts.body !== undefined) headers["content-type"] = "application/json";
  if (opts.passphrase) headers["x-nuzlocke-passphrase"] = opts.passphrase;

  let res: Response;
  try {
    res = await fetch(path, {
      method: opts.method ?? "GET",
      headers,
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    });
  } catch {
    throw new ApiOffline("Could not reach the server.");
  }

  if (res.status === 401) throw new ApiUnauthorized("A valid edit passphrase is required.");
  if (res.status === 204) return undefined as T;

  const data = (await res.json().catch(() => null)) as unknown;
  const fromOurApi =
    data !== null &&
    typeof data === "object" &&
    typeof (data as { error?: unknown }).error === "string";

  if (!res.ok) {
    const message = fromOurApi
      ? (data as { error: string }).error
      : `Request failed (${res.status}).`;
    // 503 / 5xx, or a non-JSON 404 (the function isn't deployed / running) mean
    // "no backend" -> fall back to local mode rather than surfacing an error.
    if (res.status === 503 || res.status >= 502 || (res.status === 404 && !fromOurApi)) {
      throw new ApiOffline(message);
    }
    throw new ApiError(message);
  }

  // A 2xx that isn't JSON means the function didn't handle it (e.g. an SPA
  // fallback served index.html) — treat as "no backend".
  if (data === null) throw new ApiOffline("The tournaments service is unavailable.");

  return data as T;
}

export async function listTournaments(): Promise<TournamentSummary[]> {
  const { tournaments } = await request<{ tournaments: TournamentSummary[] }>(BASE);
  return tournaments;
}

export function getTournament(id: string): Promise<Tournament> {
  return request<Tournament>(`${BASE}/${encodeURIComponent(id)}`);
}

export function createTournament(
  name: string,
  opts: { players?: PlayerRun[]; passphrase?: string } = {},
): Promise<Tournament> {
  return request<Tournament>(BASE, {
    method: "POST",
    body: { name, players: opts.players },
    passphrase: opts.passphrase,
  });
}

export function saveTournament(
  id: string,
  patch: { name?: string; players?: PlayerRun[] },
  passphrase?: string,
): Promise<Tournament> {
  return request<Tournament>(`${BASE}/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: patch,
    passphrase,
  });
}

export function deleteTournament(id: string, passphrase?: string): Promise<void> {
  return request<void>(`${BASE}/${encodeURIComponent(id)}`, { method: "DELETE", passphrase });
}
