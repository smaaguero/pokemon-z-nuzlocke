import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { X } from "lucide-react";
import { POKEMON_TYPES, typeChipClass } from "../../data/pokemon-types";
import { dexIdFromName } from "../../data/pokedex";
import { typesFromDex } from "../../data/pokemon-type-by-dex";
import { spriteUrlFromDex } from "../../lib/sprites";
import type { PokemonEntry } from "../../types/nuzlocke";
import type { NewPokemonInput } from "../../hooks/useNuzlockeState";

const autoDex = (species: string): string => {
  const dex = dexIdFromName(species);
  return dex != null ? String(dex) : "";
};

// Best-effort type lookup from whatever is currently in the Dex # field.
// Only a convenience default — randomizers can scramble types too, so the
// caller always lets the player override it afterwards.
const autoTypes = (dexValue: string): string[] | null => {
  const n = Number(dexValue);
  return Number.isInteger(n) && n > 0 ? typesFromDex(n) : null;
};

interface Props {
  open: boolean;
  mode: "add" | "edit";
  initial: PokemonEntry | null;
  partyFull: boolean;
  onClose: () => void;
  onSubmit: (input: NewPokemonInput) => void;
}

const EMPTY = {
  id: "",
  nickname: "",
  species: "",
  types: [] as string[],
  level: "5",
  ability: "",
  item: "",
  moves: ["", "", "", ""],
};

const inputCls =
  "w-full rounded-md border border-white/15 bg-zinc-900 px-2.5 py-1.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-emerald-500/50";

export default function EncounterDrawer({
  open,
  mode,
  initial,
  partyFull,
  onClose,
  onSubmit,
}: Props) {
  const [form, setForm] = useState(EMPTY);
  // Once the user edits the Dex # by hand we stop deriving it from the species.
  const [dexTouched, setDexTouched] = useState(false);
  // Once the user picks/unpicks a type chip we stop overwriting their choice.
  const [typesTouched, setTypesTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDexTouched(false);
    setTypesTouched(false);
    if (initial) {
      const numericId = /^\d+$/.test(initial.id.replace(/#\d+$/, ""))
        ? initial.id.replace(/#\d+$/, "")
        : "";
      setForm({
        id: numericId,
        nickname: initial.nickname,
        species: initial.species,
        types: initial.types,
        level: String(initial.level),
        ability: initial.ability ?? "",
        item: initial.item ?? "",
        moves: [0, 1, 2, 3].map((i) => initial.moves[i] ?? ""),
      });
    } else {
      setForm(EMPTY);
    }
  }, [open, initial]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const canSubmit = form.species.trim().length > 0 && (mode === "edit" || !partyFull);

  const toggleType = (t: string) => {
    setTypesTouched(true);
    setForm((f) => {
      if (f.types.includes(t)) return { ...f, types: f.types.filter((x) => x !== t) };
      if (f.types.length >= 2) return f;
      return { ...f, types: [...f.types, t] };
    });
  };

  const submit = () => {
    if (!canSubmit) return;
    onSubmit({
      id: form.id.trim(),
      nickname: form.nickname,
      species: form.species,
      types: form.types,
      level: Number(form.level) || 1,
      ability: form.ability,
      item: form.item,
      moves: form.moves,
    });
  };

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-white/10 bg-zinc-950 shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-white/10 bg-zinc-950 px-5 py-4">
          <h2 className="text-sm font-semibold text-zinc-100">
            {mode === "edit" ? "Edit Pokémon" : "New encounter"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="flex flex-1 flex-col gap-4 px-5 py-5"
        >
          <div className="flex items-start gap-3">
            <SpritePreview dex={form.id} />
            <div className="flex-1">
              <Field label="Species" required>
                <input
                  value={form.species}
                  onChange={(e) => {
                    const species = e.target.value;
                    const resolvedId = dexTouched ? form.id : autoDex(species);
                    const looked = typesTouched ? null : autoTypes(resolvedId);
                    setForm((f) => ({
                      ...f,
                      species,
                      id: resolvedId,
                      types: looked ?? f.types,
                    }));
                  }}
                  placeholder="e.g. Cubone"
                  className={inputCls}
                  autoFocus
                />
              </Field>
              <p className="mt-1 text-[11px] text-zinc-500">
                {form.species.trim() === ""
                  ? "The sprite is matched from the species name."
                  : autoDex(form.species) || dexTouched
                    ? `Matched to Dex #${form.id || autoDex(form.species)}.`
                    : "Species not recognised — set a Dex # below for a sprite."}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Nickname">
              <input
                value={form.nickname}
                onChange={(e) => setForm((f) => ({ ...f, nickname: e.target.value }))}
                placeholder={form.species || "optional"}
                className={inputCls}
              />
            </Field>
            <Field label="Level">
              <input
                type="number"
                min={1}
                max={100}
                value={form.level}
                onChange={(e) => setForm((f) => ({ ...f, level: e.target.value }))}
                className={inputCls}
              />
            </Field>
          </div>

          <Field label="Pokédex #" hint="auto-filled from species; override for a custom sprite">
            <input
              value={form.id}
              inputMode="numeric"
              onChange={(e) => {
                setDexTouched(true);
                const value = e.target.value;
                const looked = typesTouched ? null : autoTypes(value);
                setForm((f) => ({ ...f, id: value, types: looked ?? f.types }));
              }}
              placeholder="e.g. 104"
              className={inputCls}
            />
          </Field>

          <Field label={`Types (${form.types.length}/2)`} hint={!typesTouched && form.types.length > 0 ? "auto-filled — tap to override" : undefined}>
            <div className="flex flex-wrap gap-1.5">
              {POKEMON_TYPES.map((t) => {
                const active = form.types.includes(t);
                return (
                  <button
                    type="button"
                    key={t}
                    onClick={() => toggleType(t)}
                    aria-pressed={active}
                    className={`rounded border px-2 py-1 text-[10px] font-medium uppercase tracking-wide transition ${
                      active
                        ? typeChipClass(t)
                        : "border-white/10 bg-zinc-900 text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Ability">
              <input
                value={form.ability}
                onChange={(e) => setForm((f) => ({ ...f, ability: e.target.value }))}
                className={inputCls}
                placeholder="optional"
              />
            </Field>
            <Field label="Held item">
              <input
                value={form.item}
                onChange={(e) => setForm((f) => ({ ...f, item: e.target.value }))}
                className={inputCls}
                placeholder="optional"
              />
            </Field>
          </div>

          <Field label="Moves">
            <div className="grid grid-cols-2 gap-2">
              {form.moves.map((mv, i) => (
                <input
                  key={i}
                  value={mv}
                  onChange={(e) =>
                    setForm((f) => {
                      const moves = [...f.moves];
                      moves[i] = e.target.value;
                      return { ...f, moves };
                    })
                  }
                  placeholder={`Move ${i + 1}`}
                  className={inputCls}
                />
              ))}
            </div>
          </Field>

          {mode === "add" && partyFull && (
            <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-300">
              Party is full (6/6). Move a Pokémon to the graveyard first.
            </p>
          )}

          <div className="mt-auto flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="flex-1 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-zinc-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {mode === "edit" ? "Save changes" : "Add to party"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SpritePreview({ dex }: { dex: string }) {
  const [broken, setBroken] = useState(false);
  const clean = dex.trim().match(/^\d+/)?.[0] ?? "";
  const url = clean ? spriteUrlFromDex(Number(clean)) : "";

  useEffect(() => {
    setBroken(false);
  }, [url]);

  return (
    <div className="grid size-16 shrink-0 place-items-center rounded-lg border border-white/10 bg-zinc-900">
      {url && !broken ? (
        <img
          src={url}
          alt=""
          className="size-14 object-contain [image-rendering:pixelated]"
          onError={() => setBroken(true)}
        />
      ) : (
        <span className="text-[10px] text-zinc-600">no sprite</span>
      )}
    </div>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 flex flex-wrap items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
        {label}
        {required && <span className="text-red-400">*</span>}
        {hint && <span className="normal-case tracking-normal text-zinc-600">— {hint}</span>}
      </span>
      {children}
    </label>
  );
}
