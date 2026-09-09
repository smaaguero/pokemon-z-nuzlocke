import { ChevronDown, Pencil, Skull, Trash2 } from "lucide-react";
import type { PokemonEntry } from "../../types/nuzlocke";
import { typeChipClass } from "../../data/pokemon-types";
import { SpriteImg } from "./SpriteImg";

interface Props {
  entry: PokemonEntry;
  onMarkFallen: () => void;
  onEdit: () => void;
  onRelease: () => void;
}

export default function PokemonSlot({ entry, onMarkFallen, onEdit, onRelease }: Props) {
  const hasDetails = Boolean(entry.ability || entry.item || entry.moves.length);

  return (
    <div className="relative flex flex-col gap-3 rounded-xl border border-white/10 bg-zinc-900/60 p-3">
      <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
        <span className="size-1.5 rounded-full bg-emerald-400" />
        Alive
      </span>

      <div className="flex items-start gap-3">
        <SpriteImg entry={entry} className="size-14 shrink-0" />
        <div className="min-w-0 flex-1 pr-14">
          <p className="truncate font-semibold text-zinc-50">{entry.nickname || entry.species}</p>
          <p className="truncate text-xs text-zinc-400">
            {entry.species} · Lv. {entry.level}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {entry.types.map((t) => (
              <span
                key={t}
                className={`rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${typeChipClass(
                  t,
                )}`}
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      {hasDetails && (
        <details className="group rounded-lg">
          <summary className="flex cursor-pointer list-none items-center gap-1 text-[11px] text-zinc-400 [&::-webkit-details-marker]:hidden">
            <ChevronDown className="size-3 transition-transform group-open:rotate-180" />
            Details
          </summary>
          <dl className="mt-2 space-y-1 text-[11px] text-zinc-400">
            {entry.ability && (
              <div>
                <dt className="inline text-zinc-500">Ability: </dt>
                <dd className="inline text-zinc-300">{entry.ability}</dd>
              </div>
            )}
            {entry.item && (
              <div>
                <dt className="inline text-zinc-500">Item: </dt>
                <dd className="inline text-zinc-300">{entry.item}</dd>
              </div>
            )}
            {entry.moves.length > 0 && (
              <div>
                <dt className="text-zinc-500">Moves</dt>
                <dd className="mt-0.5 flex flex-wrap gap-1">
                  {entry.moves.map((m, i) => (
                    <span key={i} className="rounded bg-zinc-800 px-1.5 py-0.5 text-zinc-300">
                      {m}
                    </span>
                  ))}
                </dd>
              </div>
            )}
          </dl>
        </details>
      )}

      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={onMarkFallen}
          className="inline-flex items-center gap-1 rounded-md border border-red-500/30 bg-red-500/10 px-2 py-1 text-[11px] font-medium text-red-300 transition-colors hover:bg-red-500/20"
        >
          <Skull className="size-3" />
          Mark as Fallen
        </button>
        <button
          onClick={onEdit}
          className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-zinc-800 px-2 py-1 text-[11px] text-zinc-300 transition-colors hover:bg-zinc-700"
        >
          <Pencil className="size-3" />
          Edit
        </button>
        <button
          onClick={onRelease}
          className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-zinc-800 px-2 py-1 text-[11px] text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-zinc-200"
        >
          <Trash2 className="size-3" />
          Release
        </button>
      </div>
    </div>
  );
}
