// Pure damage math, kept out of the component so it can be tested directly.
//
// Core value (SDD Section 4.4):
//   ((2·Level/5 + 2) · Power · A/D) / 50 + 2
// then the Gen V+ modifier chain (weather → crit → random → STAB → type),
// floored at each step.

import { TYPE_CHART } from "../data/typeChart";
import type { PokemonType } from "./../data/pokemon-types";

export type Weather = "Neutral" | "Sun" | "Rain";

export interface DamageInput {
  level: number;
  attackStat: number;
  defenseStat: number;
  basePower: number;
  moveType: PokemonType;
  attackerStage: number; // -6..+6
  defenderStage: number; // -6..+6
  stab: boolean;
  defenderTypes: PokemonType[]; // 1-2 entries
  maxHp: number;
  weather: Weather;
  crit: boolean;
}

export interface DamageResult {
  min: number;
  max: number;
  rolls: number[]; // 16 values, ascending (rand 85..100)
  pctMin: number;
  pctMax: number;
  ko: string;
  typeEff: number;
  effectiveAttack: number;
  effectiveDefense: number;
  weatherMod: number;
}

/** Attack / Defense stat-stage multiplier. */
export function stageFactor(stage: number): number {
  const s = Math.max(-6, Math.min(6, Math.trunc(stage)));
  return s >= 0 ? (2 + s) / 2 : 2 / (2 - s);
}

function weatherModifier(weather: Weather, moveType: PokemonType): number {
  if (weather === "Sun") return moveType === "Fire" ? 1.5 : moveType === "Water" ? 0.5 : 1;
  if (weather === "Rain") return moveType === "Water" ? 1.5 : moveType === "Fire" ? 0.5 : 1;
  return 1;
}

export function computeDamage(input: DamageInput): DamageResult {
  const L = clamp(input.level, 1, 100);
  const A0 = clamp(input.attackStat, 1, 999999);
  const D0 = clamp(input.defenseStat, 1, 999999);
  const BP = clamp(input.basePower, 0, 999999);
  const H = clamp(input.maxHp, 1, 9999999);

  // A critical hit ignores the attacker's negative stages and the defender's
  // positive stages.
  const aStage = input.crit ? Math.max(0, input.attackerStage) : input.attackerStage;
  const dStage = input.crit ? Math.min(0, input.defenderStage) : input.defenderStage;
  const effectiveAttack = Math.max(1, Math.floor(A0 * stageFactor(aStage)));
  const effectiveDefense = Math.max(1, Math.floor(D0 * stageFactor(dStage)));

  const types = dedupeTypes(input.defenderTypes);
  const typeEff = types.reduce((m, t) => m * TYPE_CHART[input.moveType][t], 1);
  const weatherMod = weatherModifier(input.weather, input.moveType);

  const base =
    Math.floor(
      Math.floor((((2 * L) / 5 + 2) * BP * effectiveAttack) / effectiveDefense) / 50,
    ) + 2;

  const rollAt = (randPercent: number): number => {
    let d = base;
    d = Math.floor(d * weatherMod);
    if (input.crit) d = Math.floor(d * 1.5);
    d = Math.floor((d * randPercent) / 100);
    if (input.stab) d = Math.floor(d * 1.5);
    d = Math.floor(d * typeEff);
    if (typeEff === 0 || BP === 0) return 0;
    return Math.max(1, d);
  };

  const rolls = Array.from({ length: 16 }, (_, i) => rollAt(85 + i));
  const min = rolls[0];
  const max = rolls[rolls.length - 1];

  return {
    min,
    max,
    rolls,
    pctMin: (min / H) * 100,
    pctMax: (max / H) * 100,
    ko: koEstimate(min, max, H),
    typeEff,
    effectiveAttack,
    effectiveDefense,
    weatherMod,
  };
}

function koEstimate(min: number, max: number, hp: number): string {
  if (max <= 0) return "No damage";
  if (min >= hp) return "Guaranteed OHKO";
  if (min <= 0) return `Possible ${Math.ceil(hp / max)}HKO`;
  const guaranteed = Math.ceil(hp / min);
  const best = Math.ceil(hp / max);
  return guaranteed === best
    ? `Guaranteed ${guaranteed}HKO`
    : `Possible ${best}HKO (guaranteed ${guaranteed}HKO)`;
}

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

function dedupeTypes(types: PokemonType[]): PokemonType[] {
  return types.filter((t, i) => types.indexOf(t) === i);
}
