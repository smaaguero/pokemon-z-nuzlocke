import { useMemo, useState } from "react";
import { POKEMON_TYPES, typeChipClass, type PokemonType } from "../../data/pokemon-types";
import { TYPE_CHART } from "../../data/typeChart";

type Mode = "defensive" | "offensive";

const selectCls =
  "w-full rounded-md border border-white/15 bg-zinc-900 px-2.5 py-1.5 text-sm text-zinc-100 outline-none focus:border-emerald-500/50";

const TONE: Record<string, string> = {
  danger: "text-red-300",
  warn: "text-orange-300",
  neutral: "text-zinc-300",
  good: "text-emerald-300",
  mute: "text-zinc-500",
};

const DEF_GROUPS = [
  { mult: 4, title: "4×", sub: "Double weakness", tone: "danger" },
  { mult: 2, title: "2×", sub: "Weakness", tone: "warn" },
  { mult: 1, title: "1×", sub: "Neutral", tone: "neutral" },
  { mult: 0.5, title: "½×", sub: "Resistance", tone: "good" },
  { mult: 0.25, title: "¼×", sub: "Double resistance", tone: "good" },
  { mult: 0, title: "0×", sub: "Immune", tone: "mute" },
] as const;

const OFF_GROUPS = [
  { mult: 2, title: "2×", sub: "Super effective", tone: "warn" },
  { mult: 1, title: "1×", sub: "Neutral", tone: "neutral" },
  { mult: 0.5, title: "½×", sub: "Not very effective", tone: "good" },
  { mult: 0, title: "0×", sub: "No effect", tone: "mute" },
] as const;

function bucket(pairs: [PokemonType, number][]): Map<number, PokemonType[]> {
  const map = new Map<number, PokemonType[]>();
  for (const [type, mult] of pairs) {
    const list = map.get(mult) ?? [];
    list.push(type);
    map.set(mult, list);
  }
  return map;
}

function ResultGroup({
  title,
  sub,
  tone,
  types,
}: {
  title: string;
  sub: string;
  tone: string;
  types: PokemonType[];
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-3">
      <div className="flex items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <span className={`text-sm font-bold tabular-nums ${TONE[tone]}`}>{title}</span>
          <span className="text-[11px] uppercase tracking-wide text-zinc-500">{sub}</span>
        </div>
        <span className="text-[11px] tabular-nums text-zinc-600">{types.length}</span>
      </div>
      {types.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {types.map((t) => (
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
      ) : (
        <p className="mt-2 text-[11px] text-zinc-600">None</p>
      )}
    </div>
  );
}

export default function TypeCalculator() {
  const [mode, setMode] = useState<Mode>("defensive");
  const [primary, setPrimary] = useState<PokemonType>("Normal");
  const [secondary, setSecondary] = useState<PokemonType | "">("");
  const [attacking, setAttacking] = useState<PokemonType>("Normal");

  const defensive = useMemo(() => {
    const pairs = POKEMON_TYPES.map((atk): [PokemonType, number] => {
      let mult = TYPE_CHART[atk][primary];
      if (secondary && secondary !== primary) mult *= TYPE_CHART[atk][secondary];
      return [atk, mult];
    });
    return bucket(pairs);
  }, [primary, secondary]);

  const offensive = useMemo(() => {
    const pairs = POKEMON_TYPES.map((def): [PokemonType, number] => [def, TYPE_CHART[attacking][def]]);
    return bucket(pairs);
  }, [attacking]);

  return (
    <div className="mt-8 space-y-6">
      <div className="inline-flex rounded-lg border border-white/10 bg-zinc-900 p-0.5 text-xs">
        {(["defensive", "offensive"] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            aria-pressed={mode === m}
            className={`rounded-md px-3 py-1.5 capitalize transition-colors ${
              mode === m ? "bg-zinc-700 text-zinc-50" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {mode === "defensive" ? (
        <>
          <div className="grid gap-4 rounded-2xl border border-white/10 bg-zinc-900/40 p-4 sm:grid-cols-2 sm:p-6">
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                Primary type
              </span>
              <select
                value={primary}
                onChange={(e) => setPrimary(e.target.value as PokemonType)}
                className={selectCls}
              >
                {POKEMON_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                Secondary type <span className="text-zinc-600">— optional</span>
              </span>
              <select
                value={secondary}
                onChange={(e) => setSecondary(e.target.value as PokemonType | "")}
                className={selectCls}
              >
                <option value="">None</option>
                {POKEMON_TYPES.filter((t) => t !== primary).map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <p className="text-[11px] text-zinc-500 sm:col-span-2">
              Incoming damage a{" "}
              <span className="text-zinc-300">
                {primary}
                {secondary && secondary !== primary ? ` / ${secondary}` : ""}
              </span>{" "}
              defender takes from each attacking type.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {DEF_GROUPS.map((g) => (
              <ResultGroup
                key={g.mult}
                title={g.title}
                sub={g.sub}
                tone={g.tone}
                types={defensive.get(g.mult) ?? []}
              />
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-4 sm:p-6">
            <label className="block max-w-xs">
              <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                Attacking type
              </span>
              <select
                value={attacking}
                onChange={(e) => setAttacking(e.target.value as PokemonType)}
                className={selectCls}
              >
                {POKEMON_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <p className="mt-2 text-[11px] text-zinc-500">
              Outgoing damage a <span className="text-zinc-300">{attacking}</span> move deals to each
              defending type.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {OFF_GROUPS.map((g) => (
              <ResultGroup
                key={g.mult}
                title={g.title}
                sub={g.sub}
                tone={g.tone}
                types={offensive.get(g.mult) ?? []}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
