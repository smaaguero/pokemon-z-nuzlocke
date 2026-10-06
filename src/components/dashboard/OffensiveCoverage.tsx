import { POKEMON_TYPES, typeChipClass, type PokemonType } from "../../data/pokemon-types";
import { TYPE_CHART } from "../../data/typeChart";
import { DAMAGING_MOVE_TYPES, STATUS_MOVE_KEYS, moveKey } from "../../data/move-types";
import type { PokemonEntry } from "../../types/nuzlocke";

interface Props {
  party: PokemonEntry[];
}

const hasOwn = (obj: object, key: string) => Object.prototype.hasOwnProperty.call(obj, key);

function Chip({ type, dim = false }: { type: PokemonType; dim?: boolean }) {
  return (
    <span
      className={`rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${typeChipClass(
        type,
      )} ${dim ? "opacity-50" : ""}`}
    >
      {type}
    </span>
  );
}

export default function OffensiveCoverage({ party }: Props) {
  // Which move types the team can deal damage with, and which move names we
  // could not place at all (usually a typo).
  const moveTypes = new Set<PokemonType>();
  const unknown: string[] = [];
  let registered = 0;

  for (const entry of party) {
    for (const raw of entry.moves) {
      const name = raw.trim();
      if (!name) continue;
      registered++;
      const key = moveKey(name);
      if (hasOwn(DAMAGING_MOVE_TYPES, key)) moveTypes.add(DAMAGING_MOVE_TYPES[key]);
      else if (!STATUS_MOVE_KEYS.has(key)) unknown.push(name);
    }
  }

  const types = [...moveTypes];
  const covered = POKEMON_TYPES.filter((def) => types.some((atk) => TYPE_CHART[atk][def] >= 2));
  const uncovered = POKEMON_TYPES.filter((def) => !covered.includes(def));

  return (
    <section className="rounded-2xl border border-white/10 bg-zinc-900/40 p-4 sm:p-6">
      <h2 className="text-sm font-semibold text-zinc-100">Team offensive coverage</h2>
      <p className="mt-1 text-xs text-zinc-500">
        Defending types your team can hit for super-effective damage (2× or more), based on the
        damaging moves registered on your living Pokémon.
      </p>

      {registered === 0 ? (
        <p className="mt-4 text-sm text-zinc-500">
          Register moves on your Pokémon to see which types your team can hit.
        </p>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-zinc-500">Move types on the team:</span>
            {types.length > 0 ? (
              types.map((t) => <Chip key={t} type={t} />)
            ) : (
              <span className="text-zinc-600">none recognised</span>
            )}
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-emerald-400">
                Covered ({covered.length}/18)
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
                {covered.length > 0 ? (
                  covered.map((t) => <Chip key={t} type={t} />)
                ) : (
                  <span className="text-xs text-zinc-600">none</span>
                )}
              </div>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                Not covered ({uncovered.length}/18)
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
                {uncovered.map((t) => (
                  <Chip key={t} type={t} dim />
                ))}
              </div>
            </div>
          </div>

          {unknown.length > 0 && (
            <p className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
              Not recognised, so not counted: {unknown.join(", ")}. Check the spelling (e.g.
              "Thunder Shock").
            </p>
          )}
        </>
      )}
    </section>
  );
}
