import { useEffect, useRef, useState } from "react";
import { Download, Plus, Upload, UserPlus } from "lucide-react";
import { useNuzlockeState } from "../../hooks/useNuzlockeState";
import type { NewPokemonInput, PokemonPatch } from "../../hooks/useNuzlockeState";
import type { PokemonEntry } from "../../types/nuzlocke";
import PlayerCard from "./PlayerCard";
import TeamCoverage from "./TeamCoverage";
import BoxSection from "./BoxSection";
import OffensiveCoverage from "./OffensiveCoverage";
import GraveyardSection from "./GraveyardSection";
import EncounterDrawer from "./EncounterDrawer";
import FallenDialog from "./FallenDialog";
import ScopeBar from "./ScopeBar";

type Toast = { kind: "success" | "error"; msg: string };

export default function Dashboard() {
  const state = useNuzlockeState();
  const [drawer, setDrawer] = useState<{
    open: boolean;
    entry: PokemonEntry | null;
    to: "party" | "box";
  }>({
    open: false,
    entry: null,
    to: "party",
  });
  const [fallen, setFallen] = useState<PokemonEntry | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 4500);
    return () => window.clearTimeout(t);
  }, [toast]);

  const scopeBar = (
    <ScopeBar
      scope={state.scope}
      tournaments={state.tournaments}
      sync={state.sync}
      online={state.online}
      onOpenTournament={(id) => void state.openTournament(id)}
      onUseLocal={state.useLocalRun}
      onRetry={state.retrySync}
    />
  );

  if (!state.hydrated) {
    return (
      <div className="mt-8 rounded-xl border border-white/10 bg-zinc-900/60 p-6 text-sm text-zinc-400">
        Loading your run…
      </div>
    );
  }

  const player = state.activePlayer;

  if (!player) {
    return (
      <div className="mt-8 space-y-6">
        {scopeBar}
        <div className="rounded-xl border border-white/10 bg-zinc-900/60 p-6 text-sm text-zinc-400">
          <p>This run has no players yet.</p>
          <button
            onClick={() => state.addPlayer("Player 1")}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-emerald-400"
          >
            <UserPlus className="size-4" />
            Add a player
          </button>
        </div>
      </div>
    );
  }

  const partyFull = player.party.length >= state.maxParty;

  // Explicit arguments: these are also passed straight to onClick handlers.
  const openAdd = (to: "party" | "box" = "party") => setDrawer({ open: true, entry: null, to });
  const openEdit = (entry: PokemonEntry) => setDrawer({ open: true, entry, to: "party" });
  const closeDrawer = () => setDrawer({ open: false, entry: null, to: "party" });

  const handleSubmit = (input: NewPokemonInput, to: "party" | "box") => {
    if (drawer.entry) {
      const patch: PokemonPatch = {
        id: input.id,
        nickname: input.nickname,
        species: input.species,
        types: input.types,
        level: input.level,
        ability: input.ability,
        item: input.item,
        moves: input.moves,
      };
      state.updatePokemon(player.playerId, drawer.entry.id, patch);
    } else {
      state.addPokemon(player.playerId, input, to);
    }
    closeDrawer();
  };

  const handleExport = () => {
    const blob = new Blob([state.exportBackup()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "nuzlocke_backup.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setToast({ kind: "success", msg: "Save exported as nuzlocke_backup.json" });
  };

  const handleImportFile = async (file: File) => {
    let text: string;
    try {
      text = await file.text();
    } catch {
      setToast({ kind: "error", msg: "Could not read that file." });
      return;
    }
    if (
      !window.confirm(
        "Import this backup? It will replace your current teams and graveyard on this device.",
      )
    ) {
      return;
    }
    const result = state.importBackup(text);
    setToast(
      result.ok
        ? { kind: "success", msg: `Save imported — ${result.players} player(s) restored.` }
        : { kind: "error", msg: result.error },
    );
  };

  return (
    <div className="mt-8 space-y-6">
      {scopeBar}

      <div className="flex flex-wrap items-center gap-2">
        {state.players.map((p) => (
          <button
            key={p.playerId}
            onClick={() => state.setActivePlayer(p.playerId)}
            className={`rounded-full border px-3 py-1 text-xs transition-colors ${
              p.playerId === player.playerId
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                : "border-white/10 bg-zinc-900 text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {p.playerName}
          </button>
        ))}
        <button
          onClick={() => state.addPlayer(`Player ${state.players.length + 1}`)}
          className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-zinc-900 px-3 py-1 text-xs text-zinc-400 hover:text-zinc-200"
        >
          <UserPlus className="size-3.5" />
          Add player
        </button>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800"
          >
            <Upload className="size-3.5" />
            Import Save
          </button>
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800"
          >
            <Download className="size-3.5" />
            Export Save
          </button>
          <button
            onClick={() => openAdd("party")}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-emerald-400"
          >
            <Plus className="size-4" />
            Register encounter
          </button>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) void handleImportFile(f);
          }}
        />
      </div>

      <PlayerCard
        player={player}
        maxParty={state.maxParty}
        onRename={(name) => state.renamePlayer(player.playerId, name)}
        onAddEncounter={() => openAdd("party")}
        onMarkFallen={(entry) => setFallen(entry)}
        onEdit={openEdit}
        onRelease={(entry) => {
          if (window.confirm(`Release ${entry.nickname || entry.species} from the party?`)) {
            state.removePokemon(player.playerId, entry.id);
          }
        }}
        onSendToBox={(entry) => state.moveToBox(player.playerId, entry.id)}
      />

      <TeamCoverage party={player.party} />

      <OffensiveCoverage party={player.party} />

      <BoxSection
        box={player.box ?? []}
        partyFull={partyFull}
        onAdd={() => openAdd("box")}
        onToParty={(entry) => state.moveToParty(player.playerId, entry.id)}
        onEdit={openEdit}
        onRelease={(entry) => {
          if (window.confirm(`Release ${entry.nickname || entry.species} from the PC?`)) {
            state.removePokemon(player.playerId, entry.id);
          }
        }}
      />

      <GraveyardSection
        entries={player.graveyard}
        partyFull={partyFull}
        onRevive={(id) => state.revivePokemon(player.playerId, id)}
        onRemove={(id) => state.removePokemon(player.playerId, id)}
      />

      <EncounterDrawer
        open={drawer.open}
        target={drawer.to}
        mode={drawer.entry ? "edit" : "add"}
        initial={drawer.entry}
        partyFull={partyFull}
        onClose={closeDrawer}
        onSubmit={handleSubmit}
      />

      <FallenDialog
        entry={fallen}
        onClose={() => setFallen(null)}
        onConfirm={(death) => {
          if (fallen) {
            state.moveToGraveyard(player.playerId, fallen.id, death);
            setFallen(null);
          }
        }}
      />

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed inset-x-4 bottom-4 z-[80] mx-auto max-w-sm rounded-lg border px-4 py-2.5 text-sm shadow-xl shadow-black/40 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 ${
            toast.kind === "success"
              ? "border-emerald-500/40 bg-emerald-950 text-emerald-200"
              : "border-red-500/40 bg-red-950 text-red-200"
          }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}
