import { useState } from "react";
import { Check, Pencil, Plus, Shield, Skull, Sparkles, Trophy, Users } from "lucide-react";
import type { PlayerRun, PokemonEntry } from "../../types/nuzlocke";
import PokemonSlot from "./PokemonSlot";

interface Props {
  player: PlayerRun;
  maxParty: number;
  onRename: (name: string) => void;
  onAddEncounter: () => void;
  onMarkFallen: (entry: PokemonEntry) => void;
  onEdit: (entry: PokemonEntry) => void;
  onRelease: (entry: PokemonEntry) => void;
  onSendToBox: (entry: PokemonEntry) => void;
}

export default function PlayerCard({
  player,
  maxParty,
  onRename,
  onAddEncounter,
  onMarkFallen,
  onEdit,
  onRelease,
  onSendToBox,
}: Props) {
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(player.playerName);

  const caught = player.party.length + (player.box?.length ?? 0) + player.graveyard.length;
  const deaths = player.graveyard.length;

  const milestones = [
    caught >= 1 && { icon: Sparkles, label: "First Catch" },
    caught >= 6 && { icon: Trophy, label: `${caught} Caught` },
    player.party.length >= maxParty && { icon: Users, label: "Full Party" },
    deaths >= 1 && { icon: Skull, label: `${deaths} Fallen` },
    caught >= 6 && deaths === 0 && { icon: Shield, label: "Flawless" },
  ].filter(Boolean) as { icon: typeof Sparkles; label: string }[];

  const slots: (PokemonEntry | null)[] = Array.from(
    { length: maxParty },
    (_, i) => player.party[i] ?? null,
  );

  const commitName = () => {
    onRename(nameDraft);
    setEditingName(false);
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-zinc-900/40 p-4 sm:p-6">
      <header className="flex items-center gap-3">
        {player.avatarUrl ? (
          <img src={player.avatarUrl} alt="" className="size-12 rounded-full object-cover" />
        ) : (
          <div className="grid size-12 place-items-center rounded-full bg-gradient-to-br from-emerald-500/30 to-zinc-800 text-lg font-bold text-emerald-100">
            {player.playerName.slice(0, 1).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          {editingName ? (
            <span className="flex items-center gap-1">
              <input
                autoFocus
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitName();
                  if (e.key === "Escape") {
                    setNameDraft(player.playerName);
                    setEditingName(false);
                  }
                }}
                className="w-40 rounded-md border border-white/15 bg-zinc-950 px-2 py-1 text-sm text-zinc-100 outline-none focus:border-emerald-500/50"
              />
              <button
                onClick={commitName}
                className="rounded-md p-1 text-emerald-300 hover:bg-white/5"
                aria-label="Save name"
              >
                <Check className="size-4" />
              </button>
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <h2 className="truncate text-lg font-semibold text-zinc-50">{player.playerName}</h2>
              <button
                onClick={() => {
                  setNameDraft(player.playerName);
                  setEditingName(true);
                }}
                className="rounded-md p-1 text-zinc-500 hover:bg-white/5 hover:text-zinc-300"
                aria-label="Rename player"
              >
                <Pencil className="size-3.5" />
              </button>
            </span>
          )}
          <p className="text-xs text-zinc-500">
            {player.party.length}/{maxParty} in party · {caught} caught
          </p>
        </div>
      </header>

      {milestones.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {milestones.map((m) => {
            const Icon = m.icon;
            return (
              <span
                key={m.label}
                className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-zinc-800/60 px-2.5 py-1 text-[11px] text-zinc-300"
              >
                <Icon className="size-3 text-emerald-400" />
                {m.label}
              </span>
            );
          })}
        </div>
      )}

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {slots.map((entry, i) =>
          entry ? (
            <PokemonSlot
              key={entry.id}
              entry={entry}
              onMarkFallen={() => onMarkFallen(entry)}
              onEdit={() => onEdit(entry)}
              onRelease={() => onRelease(entry)}
              onSendToBox={() => onSendToBox(entry)}
            />
          ) : (
            <button
              key={`empty-${i}`}
              onClick={onAddEncounter}
              className="flex min-h-[104px] flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-white/15 bg-zinc-900/30 text-xs text-zinc-500 transition-colors hover:border-emerald-500/40 hover:text-emerald-300"
            >
              <Plus className="size-5" />
              Add encounter
            </button>
          ),
        )}
      </div>
    </section>
  );
}
