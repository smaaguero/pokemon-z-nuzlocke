import { MapPin, Skull, Trash2, Undo2 } from "lucide-react";
import type { PokemonEntry } from "../../types/nuzlocke";
import { typeChipClass } from "../../data/pokemon-types";
import { SpriteImg } from "./SpriteImg";

interface Props {
  entries: PokemonEntry[];
  partyFull: boolean;
  onRevive: (id: string) => void;
  onRemove: (id: string) => void;
}

function formatDate(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString();
}

export default function GraveyardSection({ entries, partyFull, onRevive, onRemove }: Props) {
  return (
    <section className="rounded-2xl border border-white/10 bg-zinc-950/60 p-4 sm:p-6">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Skull className="size-5 text-zinc-400" />
          <h2 className="text-lg font-semibold text-zinc-100">Graveyard</h2>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold tabular-nums text-zinc-100">{entries.length}</span>
          <span className="text-xs uppercase tracking-wide text-zinc-500">casualties</span>
        </div>
      </header>

      {entries.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-500">No casualties yet — keep them all alive.</p>
      ) : (
        <ul className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="flex flex-col gap-3 rounded-xl border border-white/10 bg-zinc-900/40 p-3"
            >
              <div className="flex items-start gap-3">
                <SpriteImg entry={entry} className="size-12 shrink-0" grayscale />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-zinc-300">
                    {entry.nickname || entry.species}
                  </p>
                  <p className="truncate text-xs text-zinc-500">
                    {entry.species} · Lv. {entry.deathDetails?.levelAtDeath ?? entry.level}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1 opacity-70">
                    {entry.types.map((t) => (
                      <span
                        key={t}
                        className={`rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase ${typeChipClass(
                          t,
                        )}`}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-lg bg-zinc-950/60 p-2 text-[11px] text-zinc-400">
                <p className="flex items-center gap-1">
                  <MapPin className="size-3 shrink-0 text-zinc-500" />
                  <span className="truncate">
                    Fell at {entry.deathDetails?.location || "an unknown place"}
                  </span>
                </p>
                {entry.deathDetails?.defeatedBy && (
                  <p className="mt-0.5 pl-4">Defeated by {entry.deathDetails.defeatedBy}</p>
                )}
                {entry.deathDetails?.timestamp && (
                  <p className="mt-0.5 pl-4 text-zinc-600">
                    {formatDate(entry.deathDetails.timestamp)}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => onRevive(entry.id)}
                  disabled={partyFull}
                  title={partyFull ? "Party is full" : "Move back to party"}
                  className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-zinc-800 px-2 py-1 text-[11px] text-zinc-300 transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Undo2 className="size-3" />
                  Undo
                </button>
                <button
                  onClick={() => {
                    if (window.confirm(`Permanently remove ${entry.nickname || entry.species}?`)) {
                      onRemove(entry.id);
                    }
                  }}
                  className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-zinc-800 px-2 py-1 text-[11px] text-zinc-500 transition-colors hover:bg-zinc-700 hover:text-zinc-300"
                >
                  <Trash2 className="size-3" />
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
