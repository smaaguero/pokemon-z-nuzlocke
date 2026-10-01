import { useEffect, useState } from "react";

const STORAGE_KEY = "pokemon-z-nuzlocke:clauses";

const CLAUSES = [
  {
    id: "dupes",
    name: "Cláusula de Repetidos",
    tag: "Dupes Clause",
    desc: "Permite ignorar y volver a buscar el encuentro de una zona si el Pokémon pertenece a una especie que ya has capturado anteriormente.",
  },
  {
    id: "shiny",
    name: "Cláusula Variocolor",
    tag: "Shiny Clause",
    desc: "Los Pokémon variocolor (shiny) siempre pueden capturarse, independientemente de si son el primer encuentro de la zona.",
  },
  {
    id: "levelcap",
    name: "Límite de Nivel",
    tag: "Level Cap",
    desc: "El equipo no puede superar el nivel del Pokémon más fuerte del siguiente Líder de Gimnasio.",
  },
  {
    id: "battleitems",
    name: "Objetos en Combate",
    tag: "Battle Item Clause",
    desc: "No se pueden usar objetos para curar o reanimar Pokémon durante los combates, especialmente contra Líderes de Gimnasio y el Alto Mando.",
  },
  {
    id: "legendary",
    name: "Cláusula de Legendarios",
    tag: "Legendary Clause",
    desc: "Los Pokémon legendarios no cuentan como encuentro válido y no pueden capturarse en ningún momento del reto.",
  },
  {
    id: "breeding",
    name: "Cláusula de Cría",
    tag: "Breeding Clause",
    desc: "No se permite criar Pokémon (breeding) para fabricar naturalezas o IVs perfectos; el equipo se queda con lo que dé el randomizador.",
  },
] as const;

type ClauseId = (typeof CLAUSES)[number]["id"];
type ClauseState = Record<ClauseId, boolean>;

const DEFAULT_STATE: ClauseState = {
  dupes: false,
  shiny: false,
  levelcap: false,
  battleitems: false,
  legendary: false,
  breeding: false,
};

function loadState(): ClauseState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as Partial<Record<string, unknown>>;
    return {
      dupes: parsed.dupes === true,
      shiny: parsed.shiny === true,
      levelcap: parsed.levelcap === true,
      battleitems: parsed.battleitems === true,
      legendary: parsed.legendary === true,
      breeding: parsed.breeding === true,
    };
  } catch {
    return DEFAULT_STATE;
  }
}

export default function RulesClauses() {
  const [state, setState] = useState<ClauseState>(DEFAULT_STATE);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setState(loadState());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* almacenamiento no disponible: se sigue trabajando en memoria */
    }
  }, [state, hydrated]);

  const toggle = (id: ClauseId) => setState((s) => ({ ...s, [id]: !s[id] }));

  return (
    <div className="mt-4 space-y-3">
      <p className="text-xs text-zinc-500">
        Activa las cláusulas que uséis en tu partida. La configuración se guarda en este dispositivo.
      </p>

      {CLAUSES.map((c) => {
        const on = state[c.id];
        return (
          <div
            key={c.id}
            className={`rounded-xl border p-4 transition-colors ${
              on ? "border-emerald-500/40 bg-emerald-500/5" : "border-white/10 bg-zinc-900/50"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-zinc-100">{c.name}</h3>
                  <span className="rounded-full border border-white/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-zinc-500">
                    {c.tag}
                  </span>
                </div>
                <p className="mt-1 text-sm leading-relaxed text-zinc-400">{c.desc}</p>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={on}
                aria-label={`${on ? "Desactivar" : "Activar"} ${c.name}`}
                onClick={() => toggle(c.id)}
                className={`mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                  on ? "bg-emerald-500" : "bg-zinc-700"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block size-5 rounded-full bg-white transition-transform ${
                    on ? "translate-x-[1.375rem]" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>

            <p
              className={`mt-3 text-[11px] font-medium uppercase tracking-wide ${
                on ? "text-emerald-400" : "text-zinc-600"
              }`}
            >
              {on ? "Activada" : "Desactivada"}
            </p>
          </div>
        );
      })}
    </div>
  );
}
