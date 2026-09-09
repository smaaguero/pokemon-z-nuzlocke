import { Check, CloudOff, KeyRound, Loader2, RefreshCw } from "lucide-react";
import type { Scope, SyncState } from "../../hooks/useNuzlockeState";
import type { TournamentSummary } from "../../types/nuzlocke";

interface Props {
  scope: Scope;
  tournaments: TournamentSummary[];
  sync: SyncState;
  online: boolean;
  onOpenTournament: (id: string) => void;
  onUseLocal: () => void;
  onRetry: () => void;
}

function timeAgo(ts?: number): string {
  if (!ts) return "";
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.round(m / 60)}h ago`;
}

function SyncPill({ sync, onRetry }: { sync: SyncState; onRetry: () => void }) {
  const base = "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px]";
  switch (sync.status) {
    case "loading":
      return (
        <span className={`${base} border-white/10 bg-zinc-900 text-zinc-400`}>
          <Loader2 className="size-3 animate-spin" /> Loading…
        </span>
      );
    case "pending":
    case "saving":
      return (
        <span className={`${base} border-white/10 bg-zinc-900 text-zinc-400`}>
          <Loader2 className="size-3 animate-spin" /> Saving…
        </span>
      );
    case "saved":
      return (
        <span className={`${base} border-emerald-500/30 bg-emerald-500/10 text-emerald-300`}>
          <Check className="size-3" /> Saved{sync.savedAt ? ` ${timeAgo(sync.savedAt)}` : ""}
        </span>
      );
    case "offline":
      return (
        <button
          onClick={onRetry}
          className={`${base} border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20`}
        >
          <CloudOff className="size-3" /> Offline — saved on device · Retry
        </button>
      );
    case "unauthorized":
      return (
        <a
          href="/tournaments"
          className={`${base} border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20`}
        >
          <KeyRound className="size-3" /> Passphrase required
        </a>
      );
    case "error":
      return (
        <button
          onClick={onRetry}
          className={`${base} border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20`}
        >
          <RefreshCw className="size-3" /> Sync error · Retry
        </button>
      );
    default:
      return null;
  }
}

export default function ScopeBar({
  scope,
  tournaments,
  sync,
  online,
  onOpenTournament,
  onUseLocal,
  onRetry,
}: Props) {
  const value = scope.kind === "tournament" ? scope.id : "__local__";

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-white/10 bg-zinc-900/50 px-3 py-2">
      <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Run</span>

      <select
        value={value}
        onChange={(e) => {
          const v = e.target.value;
          if (v === "__local__") onUseLocal();
          else onOpenTournament(v);
        }}
        className="rounded-md border border-white/15 bg-zinc-900 px-2 py-1 text-sm text-zinc-100 outline-none focus:border-emerald-500/50"
      >
        <option value="__local__">Local run (this device)</option>
        {tournaments.length > 0 && (
          <optgroup label="Tournaments">
            {tournaments.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </optgroup>
        )}
        {scope.kind === "tournament" && !tournaments.some((t) => t.id === scope.id) && (
          <option value={scope.id}>{scope.name}</option>
        )}
      </select>

      <a
        href="/tournaments"
        className="text-xs text-emerald-400 underline-offset-2 hover:underline"
      >
        Manage
      </a>

      <div className="ml-auto flex items-center gap-2">
        {scope.kind === "tournament" ? (
          <SyncPill sync={sync} onRetry={onRetry} />
        ) : (
          <span className="text-[11px] text-zinc-500">
            Not synced — {online ? "create a tournament to save across devices" : "server offline"}
          </span>
        )}
      </div>
    </div>
  );
}
