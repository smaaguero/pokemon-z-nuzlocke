import { useEffect, useState } from "react";
import { Skull, X } from "lucide-react";
import type { PokemonEntry } from "../../types/nuzlocke";
import type { DeathInput } from "../../hooks/useNuzlockeState";

interface Props {
  entry: PokemonEntry | null;
  onClose: () => void;
  onConfirm: (death: DeathInput) => void;
}

const inputCls =
  "w-full rounded-md border border-white/15 bg-zinc-900 px-2.5 py-1.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-red-500/50";

export default function FallenDialog({ entry, onClose, onConfirm }: Props) {
  const [location, setLocation] = useState("");
  const [defeatedBy, setDefeatedBy] = useState("");
  const [level, setLevel] = useState("");

  useEffect(() => {
    if (!entry) return;
    setLocation("");
    setDefeatedBy("");
    setLevel(String(entry.level));
  }, [entry]);

  useEffect(() => {
    if (!entry) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [entry, onClose]);

  if (!entry) return null;

  const canConfirm = location.trim().length > 0;

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-zinc-950 p-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
            <Skull className="size-4 text-red-400" />
            Mark {entry.nickname || entry.species} as fallen
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-zinc-400 hover:bg-white/5"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (canConfirm) {
              onConfirm({
                location,
                defeatedBy: defeatedBy.trim() || undefined,
                levelAtDeath: Number(level) || entry.level,
              });
            }
          }}
          className="mt-4 space-y-3"
        >
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-zinc-500">
              Location where it fell <span className="text-red-400">*</span>
            </span>
            <input
              autoFocus
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Vermilion Gym"
              className={inputCls}
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                Defeated by
              </span>
              <input
                value={defeatedBy}
                onChange={(e) => setDefeatedBy(e.target.value)}
                placeholder="optional"
                className={inputCls}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                Level at death
              </span>
              <input
                type="number"
                min={1}
                max={100}
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className={inputCls}
              />
            </label>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canConfirm}
              className="flex-1 rounded-lg bg-red-500 px-3 py-2 text-sm font-semibold text-zinc-950 hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Send to graveyard
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
