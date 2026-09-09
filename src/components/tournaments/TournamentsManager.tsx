import { useState } from "react";
import {
  CloudOff,
  KeyRound,
  Loader2,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { useNuzlockeState } from "../../hooks/useNuzlockeState";
import type { ActionResult } from "../../hooks/useNuzlockeState";

const inputCls =
  "w-full rounded-md border border-white/15 bg-zinc-900 px-2.5 py-1.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-emerald-500/50";

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleString();
}

export default function TournamentsManager() {
  const state = useNuzlockeState();
  const [name, setName] = useState("");
  const [fromCurrent, setFromCurrent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [pass, setPass] = useState(state.passphrase);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const report = (r: ActionResult, okText: string) => {
    if (r.ok) setMsg({ kind: "ok", text: okText });
    else setMsg({ kind: "err", text: r.error });
    return r;
  };

  const handleCreate = async () => {
    if (!name.trim() || busy) return;
    setBusy(true);
    const r = await state.createTournament(name.trim(), { fromCurrent });
    setBusy(false);
    if (r.ok) {
      window.location.assign("/");
    } else {
      report(r, "");
    }
  };

  const handleOpen = async (id: string) => {
    setBusy(true);
    const r = await state.openTournament(id);
    setBusy(false);
    if (r.ok) window.location.assign("/");
    else report(r, "");
  };

  const handleRename = async (id: string) => {
    if (!draft.trim()) return;
    const r = await state.renameTournament(id, draft.trim());
    report(r, "Renamed.");
    if (r.ok) setEditingId(null);
  };

  const handleDelete = async (id: string, label: string) => {
    if (!window.confirm(`Delete tournament "${label}"? This cannot be undone.`)) return;
    report(await state.deleteTournament(id), "Tournament deleted.");
  };

  const savePass = () => {
    state.setPassphrase(pass);
    setMsg({ kind: "ok", text: pass.trim() ? "Passphrase saved on this device." : "Passphrase cleared." });
  };

  return (
    <div className="mt-8 space-y-8">
      {!state.online && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
          <CloudOff className="size-4 shrink-0" />
          The server is unreachable. You can keep playing with the local run; tournaments will
          reconnect automatically.
          <button
            onClick={() => void state.refreshTournaments()}
            className="ml-auto inline-flex items-center gap-1 rounded border border-amber-500/30 px-2 py-0.5 hover:bg-amber-500/20"
          >
            <RefreshCw className="size-3" /> Retry
          </button>
        </div>
      )}

      {msg && (
        <p
          className={`rounded-lg border px-3 py-2 text-xs ${
            msg.kind === "ok"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : "border-red-500/30 bg-red-500/10 text-red-300"
          }`}
        >
          {msg.text}
        </p>
      )}

      {/* Create */}
      <section className="rounded-2xl border border-white/10 bg-zinc-900/40 p-4 sm:p-6">
        <h2 className="text-sm font-semibold text-zinc-100">New tournament</h2>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="block flex-1">
            <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-zinc-500">
              Name
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleCreate();
              }}
              placeholder="e.g. Liga AEAT 2026"
              className={inputCls}
            />
          </label>
          <button
            onClick={() => void handleCreate()}
            disabled={busy || !name.trim()}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-zinc-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Create &amp; open
          </button>
        </div>
        <label className="mt-3 flex items-center gap-2 text-xs text-zinc-400">
          <input
            type="checkbox"
            checked={fromCurrent}
            onChange={(e) => setFromCurrent(e.target.checked)}
            className="size-4 accent-emerald-500"
          />
          Start from my current local run (copies its players &amp; graveyard)
        </label>
      </section>

      {/* Passphrase */}
      <section className="rounded-2xl border border-white/10 bg-zinc-900/40 p-4 sm:p-6">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
          <KeyRound className="size-4 text-zinc-400" />
          Edit passphrase
        </h2>
        <p className="mt-1 text-xs text-zinc-500">
          Only needed if the organiser set <code className="text-zinc-400">NUZLOCKE_EDIT_PASSPHRASE</code>{" "}
          on the deployment. Stored only on this device.
        </p>
        <div className="mt-3 flex gap-2">
          <input
            type="password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            placeholder="passphrase"
            className={`${inputCls} max-w-xs`}
          />
          <button
            onClick={savePass}
            className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800"
          >
            Save
          </button>
        </div>
      </section>

      {/* List */}
      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
            Tournaments
          </h2>
          <button
            onClick={() => void state.refreshTournaments()}
            className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300"
          >
            <RefreshCw className={`size-3 ${state.tournamentsLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {state.tournaments.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">
            {state.tournamentsLoading
              ? "Loading…"
              : state.online
                ? "No tournaments yet. Create one above."
                : "Can't reach the server right now."}
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {state.tournaments.map((t) => {
              const active = state.scope.kind === "tournament" && state.scope.id === t.id;
              return (
                <li
                  key={t.id}
                  className={`flex flex-wrap items-center gap-3 rounded-xl border p-3 ${
                    active ? "border-emerald-500/40 bg-emerald-500/5" : "border-white/10 bg-zinc-900/50"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    {editingId === t.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          autoFocus
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") void handleRename(t.id);
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          className={`${inputCls} max-w-xs`}
                        />
                        <button
                          onClick={() => void handleRename(t.id)}
                          className="text-xs text-emerald-300 hover:underline"
                        >
                          Save
                        </button>
                      </div>
                    ) : (
                      <p className="truncate font-semibold text-zinc-100">
                        {t.name}
                        {active && (
                          <span className="ml-2 text-[10px] uppercase tracking-wide text-emerald-400">
                            open
                          </span>
                        )}
                      </p>
                    )}
                    <p className="mt-0.5 text-[11px] text-zinc-500">
                      {t.playerCount} player{t.playerCount === 1 ? "" : "s"} · {t.pokemonCount} Pokémon ·
                      updated {fmtDate(t.updatedAt)}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => void handleOpen(t.id)}
                      className="inline-flex items-center gap-1 rounded-md bg-emerald-500 px-2.5 py-1 text-[11px] font-semibold text-zinc-950 hover:bg-emerald-400"
                    >
                      <Play className="size-3" /> Open
                    </button>
                    <button
                      onClick={() => {
                        setEditingId(t.id);
                        setDraft(t.name);
                      }}
                      className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-zinc-800 px-2.5 py-1 text-[11px] text-zinc-300 hover:bg-zinc-700"
                    >
                      <Pencil className="size-3" /> Rename
                    </button>
                    <button
                      onClick={() => void handleDelete(t.id, t.name)}
                      className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-zinc-800 px-2.5 py-1 text-[11px] text-zinc-400 hover:bg-zinc-700 hover:text-red-300"
                    >
                      <Trash2 className="size-3" /> Delete
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
