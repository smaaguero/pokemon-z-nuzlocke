// Data schemas — Section 5.1 of the SDD.

export interface PlayerRun {
  playerId: string;
  playerName: string;
  avatarUrl?: string;
  party: PokemonEntry[];
  graveyard: PokemonEntry[];
  // App-level extension (not in SDD 5.1): the PC. Optional so older saves and
  // backups stay valid; the store always normalises it to an array.
  box?: PokemonEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface PokemonEntry {
  id: string;
  nickname: string;
  species: string;
  types: string[]; // e.g., ["Grass", "Poison"]
  level: number;
  ability?: string;
  item?: string;
  moves: string[]; // Up to 4 moves
  status: "alive" | "fainted";
  deathDetails?: {
    location: string;
    defeatedBy?: string;
    levelAtDeath: number;
    timestamp: string;
  };
}

// --- App-level: server-persisted tournaments (beyond SDD 5.1) ---
// A tournament is a named, permanently stored container of PlayerRun records,
// shared across devices via the /api/tournaments function + Netlify Blobs.

export interface Tournament {
  id: string;
  name: string;
  players: PlayerRun[];
  createdAt: string;
  updatedAt: string;
}

export interface TournamentSummary {
  id: string;
  name: string;
  playerCount: number;
  pokemonCount: number;
  createdAt: string;
  updatedAt: string;
}
