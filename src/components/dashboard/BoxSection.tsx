import { Archive, Pencil, Plus, Trash2, Undo2 } from "lucide-react";
import type { PokemonEntry } from "../../types/nuzlocke";
import { typeChipClass } from "../../data/pokemon-types";
import { SpriteImg } from "./SpriteImg";

interface Props {
  box: PokemonEntry[];
  partyFull: boolean;
  onToParty: (entry: PokemonEntry) => void;
  onEdit: (entry: PokemonEntry) => void;
  onRelease: (entry: PokemonEntry) => void;
  onAdd: () => void;
}

export default function BoxSection({ box, partyFull, onToParty, onEdit, onRelease, onAdd }: Props) {
  return (
    <section className="rounded-2xl border border-white/10 bg-zinc-900/40 p-4 sm:p-6">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Archive className="size-5 text-zinc-400" />
          <h2 className="text-lg font-semibold text-zinc-100">PC</h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold tabular-nums text-zinc-100">{box.length}</span>
            <span className="text-xs uppercase tracking-wide text-zinc-500">stored</span>
          </div>
          <button
            onClick={onAdd}
            className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-zinc-800 px-2.5 py-1.5 text-xs text-zinc-200 hover:bg-zinc-700"
          >
            <Plus className="size-3.5" />
            Add to PC
          </button>
        </div>
      </header>

      {box.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-500">
          Nothing in the PC yet. Add a Pokémon here directly, or send one from a party card.
        </p>
      ) : (
        <ul className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {box.map((entry) => (
            <li
              key={entry.id}
              className="flex flex-col gap-3 rounded-xl border border-white/10 bg-zinc-900/60 p-3"
            >
              <div className="flex items-start gap-3">
                <SpriteImg entry={entry} className="size-12 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-zinc-100">
                    {entry.nickname || entry.species}
                  </p>
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

              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => onToParty(entry)}
                  disabled={partyFull}
                  title={partyFull ? "Party is full" : "Move to party"}
                  className="inline-flex items-center gap-1 rounded-md bg-emerald-500 px-2 py-1 text-[11px] font-semibold text-zinc-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Undo2 className="size-3" />
                  To party
                </button>
                <button
                  onClick={() => onEdit(entry)}
                  className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-zinc-800 px-2 py-1 text-[11px] text-zinc-300 hover:bg-zinc-700"
                >
                  <Pencil className="size-3" />
                  Edit
                </button>
                <button
                  onClick={() => onRelease(entry)}
                  className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-zinc-800 px-2 py-1 text-[11px] text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
                >
                  <Trash2 className="size-3" />
                  Release
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
