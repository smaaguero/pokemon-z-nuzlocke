import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { POKEMON_TYPES, type PokemonType } from "../../data/pokemon-types";
import { computeDamage, type Weather } from "../../lib/damage";

const inputCls =
  "w-full rounded-md border border-white/15 bg-zinc-900 px-2.5 py-1.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-emerald-500/50";
const STAGES = [-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6];

function clampInt(value: string, min: number, max: number, fallback: number): number {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function effInfo(m: number): { label: string; cls: string } {
  if (m === 0) return { label: "No effect (0×)", cls: "border-zinc-600/40 bg-zinc-700/20 text-zinc-400" };
  if (m >= 4) return { label: "Quad weak (4×)", cls: "border-red-500/40 bg-red-500/10 text-red-300" };
  if (m > 1) return { label: `Super effective (${m}×)`, cls: "border-orange-500/40 bg-orange-500/10 text-orange-300" };
  if (m === 1) return { label: "Neutral (1×)", cls: "border-white/15 bg-zinc-800/60 text-zinc-300" };
  if (m <= 0.25) return { label: "Doubly resisted (¼×)", cls: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" };
  return { label: "Not very effective (½×)", cls: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" };
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 flex flex-wrap items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
        {label}
        {hint && <span className="normal-case tracking-normal text-zinc-600">— {hint}</span>}
      </span>
      {children}
    </label>
  );
}

function StageSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={inputCls}>
      {STAGES.map((s) => (
        <option key={s} value={s}>
          {s > 0 ? `+${s}` : s}
        </option>
      ))}
    </select>
  );
}

export default function DamageCalculator() {
  // Attacker
  const [level, setLevel] = useState("50");
  const [atkStat, setAtkStat] = useState("120");
  const [power, setPower] = useState("80");
  const [moveType, setMoveType] = useState<PokemonType>("Normal");
  const [atkStage, setAtkStage] = useState("0");
  const [stab, setStab] = useState(false);

  // Defender
  const [defStat, setDefStat] = useState("100");
  const [defType1, setDefType1] = useState<PokemonType>("Normal");
  const [defType2, setDefType2] = useState<PokemonType | "">("");
  const [maxHp, setMaxHp] = useState("180");
  const [defStage, setDefStage] = useState("0");

  // Modifiers
  const [weather, setWeather] = useState<Weather>("Neutral");
  const [crit, setCrit] = useState(false);

  const H = clampInt(maxHp, 1, 999999, 1);
  const r = useMemo(
    () =>
      computeDamage({
        level: clampInt(level, 1, 100, 50),
        attackStat: clampInt(atkStat, 1, 9999, 1),
        defenseStat: clampInt(defStat, 1, 9999, 1),
        basePower: clampInt(power, 0, 999, 0),
        moveType,
        attackerStage: clampInt(atkStage, -6, 6, 0),
        defenderStage: clampInt(defStage, -6, 6, 0),
        stab,
        defenderTypes: defType2 && defType2 !== defType1 ? [defType1, defType2] : [defType1],
        maxHp: H,
        weather,
        crit,
      }),
    [
      level,
      atkStat,
      power,
      moveType,
      atkStage,
      stab,
      defStat,
      defType1,
      defType2,
      H,
      defStage,
      weather,
      crit,
    ],
  );

  const eff = effInfo(r.typeEff);

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1fr]">
      {/* Attacker */}
      <section className="rounded-2xl border border-white/10 bg-zinc-900/40 p-4 sm:p-6">
        <h2 className="text-sm font-semibold text-zinc-100">Attacker</h2>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Field label="Level">
            <input type="number" min={1} max={100} value={level} onChange={(e) => setLevel(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Atk / Sp. Atk" hint="stat value">
            <input type="number" min={1} value={atkStat} onChange={(e) => setAtkStat(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Move base power">
            <input type="number" min={0} value={power} onChange={(e) => setPower(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Move type">
            <select value={moveType} onChange={(e) => setMoveType(e.target.value as PokemonType)} className={inputCls}>
              {POKEMON_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Attacker stat stage" hint="−6 to +6">
            <StageSelect value={atkStage} onChange={setAtkStage} />
          </Field>
          <label className="flex items-end gap-2 pb-1.5 text-sm text-zinc-300">
            <input type="checkbox" checked={stab} onChange={(e) => setStab(e.target.checked)} className="size-4 accent-emerald-500" />
            STAB (+50%)
          </label>
        </div>
      </section>

      {/* Defender */}
      <section className="rounded-2xl border border-white/10 bg-zinc-900/40 p-4 sm:p-6">
        <h2 className="text-sm font-semibold text-zinc-100">Defender</h2>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Field label="Def / Sp. Def" hint="stat value">
            <input type="number" min={1} value={defStat} onChange={(e) => setDefStat(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Max HP">
            <input type="number" min={1} value={maxHp} onChange={(e) => setMaxHp(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Type 1">
            <select value={defType1} onChange={(e) => setDefType1(e.target.value as PokemonType)} className={inputCls}>
              {POKEMON_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Type 2" hint="optional">
            <select value={defType2} onChange={(e) => setDefType2(e.target.value as PokemonType | "")} className={inputCls}>
              <option value="">None</option>
              {POKEMON_TYPES.filter((t) => t !== defType1).map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Defender stat stage" hint="−6 to +6">
            <StageSelect value={defStage} onChange={setDefStage} />
          </Field>
          <div className="flex items-end pb-1">
            <span className={`inline-flex rounded-md border px-2 py-1 text-[11px] font-medium ${eff.cls}`}>
              {eff.label}
            </span>
          </div>
        </div>
      </section>

      {/* Modifiers */}
      <section className="rounded-2xl border border-white/10 bg-zinc-900/40 p-4 sm:col-span-full sm:p-6 lg:col-span-2">
        <h2 className="text-sm font-semibold text-zinc-100">Battle conditions</h2>
        <div className="mt-4 flex flex-wrap items-end gap-4">
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-zinc-500">Weather</span>
            <select value={weather} onChange={(e) => setWeather(e.target.value as Weather)} className={`${inputCls} w-40`}>
              <option value="Neutral">Neutral</option>
              <option value="Sun">Sun</option>
              <option value="Rain">Rain</option>
            </select>
          </label>
          <label className="flex items-center gap-2 pb-2 text-sm text-zinc-300">
            <input type="checkbox" checked={crit} onChange={(e) => setCrit(e.target.checked)} className="size-4 accent-emerald-500" />
            Critical hit (1.5×)
          </label>
          {r.weatherMod !== 1 && (
            <span className="pb-2 text-[11px] text-zinc-500">
              Weather {r.weatherMod > 1 ? "boosts" : "weakens"} this move ({r.weatherMod}×)
            </span>
          )}
        </div>
      </section>

      {/* Result */}
      <section className="rounded-2xl border border-white/10 bg-zinc-950/60 p-4 sm:col-span-full sm:p-6 lg:col-span-2">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-zinc-500">Damage</p>
            <p className="text-2xl font-bold tabular-nums text-zinc-50">
              {r.min} – {r.max}
            </p>
            <p className="text-xs tabular-nums text-zinc-400">
              {r.pctMin.toFixed(1)}% – {r.pctMax.toFixed(1)}% of {H} HP
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-wide text-zinc-500">Estimate</p>
            <p className="text-lg font-semibold text-emerald-300">{r.ko}</p>
          </div>
        </div>

        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-red-500"
            style={{ width: `${Math.min(100, r.pctMax)}%` }}
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-[11px] text-zinc-500">
          <span>
            Effective A <span className="tabular-nums text-zinc-300">{r.effectiveAttack}</span>
          </span>
          <span>
            Effective D <span className="tabular-nums text-zinc-300">{r.effectiveDefense}</span>
          </span>
          <span>
            Type <span className="text-zinc-300">{r.typeEff}×</span>
          </span>
          {crit && <span className="text-zinc-300">Critical hit</span>}
          {stab && <span className="text-zinc-300">STAB</span>}
        </div>

        <details className="mt-3">
          <summary className="cursor-pointer text-[11px] text-zinc-500 hover:text-zinc-300">
            16 damage rolls
          </summary>
          <p className="mt-1 font-mono text-[11px] tabular-nums text-zinc-400">{r.rolls.join(", ")}</p>
        </details>
      </section>
    </div>
  );
}
