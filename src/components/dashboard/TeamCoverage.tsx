import { POKEMON_TYPES, typeChipClass, type PokemonType } from "../../data/pokemon-types";
import { defensiveMultiplier } from "../../data/typeChart";
import type { PokemonEntry } from "../../types/nuzlocke";
import { SpriteImg } from "./SpriteImg";

interface Props {
  party: PokemonEntry[];
}

const VALID_TYPES = new Set<string>(POKEMON_TYPES);

function fmtMult(m: number): string {
  if (m === 0) return "0×";
  if (m === 0.25) return "¼×";
  if (m === 0.5) return "½×";
  return `${m}×`;
}

function cellTone(m: number): string {
  if (m === 0) return "bg-zinc-800 text-zinc-500";
  if (m >= 4) return "bg-red-500/20 text-red-300";
  if (m > 1) return "bg-orange-500/15 text-orange-300";
  if (m <= 0.25) return "bg-emerald-500/20 text-emerald-300";
  if (m < 1) return "bg-emerald-500/10 text-emerald-300";
  return "";
}

export default function TeamCoverage({ party }: Props) {
  const members = party
    .map((entry) => ({
      entry,
      types: entry.types.filter((t): t is PokemonType => VALID_TYPES.has(t)),
    }))
    .filter((m) => m.types.length > 0);

  if (members.length === 0) {
    return (
      <section className="rounded-2xl border border-white/10 bg-zinc-900/40 p-4 sm:p-6">
        <h2 className="text-sm font-semibold text-zinc-100">Team type coverage</h2>
        <p className="mt-2 text-sm text-zinc-500">
          Add a typed Pokémon to your party to see the team's weaknesses and resistances.
        </p>
      </section>
    );
  }

  // Only keep rows where at least one member isn't neutral — a plain "1×" row
  // for everyone is noise.
  const rows = POKEMON_TYPES.map((atk) => ({
    type: atk,
    mults: members.map((m) => defensiveMultiplier(atk, m.types)),
  })).filter((row) => row.mults.some((m) => m !== 1));

  const dangerThreshold = members.length >= 2 ? 2 : 1;
  const dangerTypes = rows
    .filter((row) => row.mults.filter((m) => m >= 2).length >= dangerThreshold)
    .map((row) => row.type);

  return (
    <section className="rounded-2xl border border-white/10 bg-zinc-900/40 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-zinc-100">Team type coverage</h2>
        <a href="/types" className="text-xs text-emerald-400 underline-offset-2 hover:underline">
          Open type calculator →
        </a>
      </div>
      <p className="mt-1 text-xs text-zinc-500">
        Incoming multiplier for each living Pokémon against every attacking type. Only
        relevant types are shown.
      </p>

      {dangerTypes.length > 0 && (
        <p className="mt-3 flex flex-wrap items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          <span>Dangerous for the team:</span>
          {dangerTypes.map((t) => (
            <span
              key={t}
              className={`rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase ${typeChipClass(t)}`}
            >
              {t}
            </span>
          ))}
        </p>
      )}

      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-500">No notable team-wide weaknesses right now.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[420px] border-separate border-spacing-y-1 text-xs">
            <thead>
              <tr>
                <th className="w-20 text-left font-medium text-zinc-500" scope="col" />
                {members.map((m) => (
                  <th key={m.entry.id} className="px-1 pb-1 text-center font-normal" scope="col">
                    <SpriteImg entry={m.entry} className="mx-auto size-8" />
                    <span className="mt-0.5 block max-w-[4.5rem] truncate text-[10px] text-zinc-500">
                      {m.entry.nickname || m.entry.species}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.type}>
                  <th scope="row" className="text-left font-normal">
                    <span
                      className={`inline-block rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${typeChipClass(
                        row.type,
                      )}`}
                    >
                      {row.type}
                    </span>
                  </th>
                  {row.mults.map((m, i) => (
                    <td key={i} className="text-center">
                      <span
                        className={`inline-block w-9 rounded py-0.5 font-semibold tabular-nums ${cellTone(m)}`}
                      >
                        {m === 1 ? "—" : fmtMult(m)}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
