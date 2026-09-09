// Data schemas — Section 5.1 of the SDD. Kept verbatim; do not add fields here.

export interface PlayerRun {
  playerId: string;
  playerName: string;
  avatarUrl?: string;
  party: PokemonEntry[];
  graveyard: PokemonEntry[];
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
