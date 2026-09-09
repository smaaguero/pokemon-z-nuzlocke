# Software Design Description (SDD)
## Pokémon Z Fangame Nuzlocke Tracker & Companion Web

---

## 1. Introduction

### 1.1 Purpose
This document provides a comprehensive Software Design Description (SDD) for a lightweight web-based tracker and companion application designed for a standard Nuzlocke run of the fangame **Pokémon Z**. It outlines the software architecture, data structures, user interface flow, and technical specifications required for development and deployment.

### 1.2 Scope
The application serves as a shared/personal dashboard to track player progress, team composition, and casualties, while offering quick-reference battle utility tools:
- **Main Dashboard**: Real-time display of each player's active party and graveyard ("Deaths / Memorial").
- **Rules Reference**: Standard Nuzlocke rules and configured clauses.
- **Battle Utilities**:
  - Interactive Type Effectiveness Chart (with dual-type calculation).
  - Damage & Stat Calculator tailored for standard combat mechanics.

### 1.3 Definitions and Acronyms
- **Nuzlocke**: A self-imposed set of challenge rules for Pokémon games (faint = death, catch only the first encounter per area).
- **Party**: The up-to-6 Pokémon currently usable by a player.
- **Graveyard / Death Box**: Pokémon that have fainted and can no longer be used.
- **SPA**: Single Page Application.
- **SSG**: Static Site Generation.

---

## 2. System Architecture & Technology Stack

Given that this is a lightweight, low-overhead project, the architecture emphasizes simplicity, zero hosting costs, client-side execution, and fast performance without requiring a dedicated backend server.

### 2.1 Technology Stack
- **Framework**: **Astro** (with **React** / **Preact** island components for interactive state).
  - *Rationale*: Provides near-zero client-side JavaScript for static text/rules, while hydrating interactive modules (calculators, team management) on demand.
- **Styling**: **Tailwind CSS**.
  - *Rationale*: Rapid UI assembly, built-in responsive utilities, dark/modern gaming aesthetic, and minimal CSS bundle output.
- **Icons & Assets**: **Lucide Icons** + localized Pokémon sprite sheets or open-source community sprite repositories.
- **State Management & Persistence**:
  - **Local State**: Browser `localStorage` for offline use and individual progress tracking.
  - **Data Interchange**: Direct JSON export/import feature to sync or share team state between participants without needing an external database.
- **Hosting & CI/CD**: **Netlify** (or Vercel / GitHub Pages). Static site hosting with automated deployment via Git repository push.

```
+-------------------------------------------------------------+
|                      Client Browser                         |
|                                                             |
|  +-------------------------------------------------------+  |
|  |             Astro Pages / Static Routing              |  |
|  +---------------------------+---------------------------+  |
|                              |                              |
|  +---------------------------v---------------------------+  |
|  |                  Interactive Islands                  |  |
|  |   - Team & Death Tracker (React/Tailwind)             |  |
|  |   - Type Effectiveness Table                          |  |
|  |   - Damage / Matchup Calculator                       |  |
|  +---------------------------+---------------------------+  |
|                              |                              |
|  +---------------------------v---------------------------+  |
|  |                  Client-Side Storage                  |  |
|  |     localStorage (Active Teams, Graveyard, Settings)  |  |
|  |     JSON Import / Export Handler                      |  |
|  +-------------------------------------------------------+  |
+-------------------------------------------------------------+
```

---

## 3. System Navigation & View Structure

The application will feature a unified top navigation bar with the following views:

1. **Overview / Teams (`/`)**:
   - Primary view displaying each participant's current active 6-Pokémon team.
   - Counter and visual roster of total deaths (Graveyard / Memorial wall).
2. **Type Chart (`/types`)**:
   - Interactive matrix for quick offensive and defensive type matchup lookups, supporting single and dual types.
3. **Damage Calculator (`/calc`)**:
   - Lightweight battle calculation utility to verify offensive damage ranges, type modifiers, and speed tiers.
4. **Rules & Overview (`/rules`)**:
   - Concise reference for the standard Nuzlocke rules active during the run.

---

## 4. Component & UI/UX Design

### 4.1 Theme & Aesthetics
- **Color Palette**: Modern dark mode baseline (slate/zinc backgrounds) with vibrant accents corresponding to canonical Pokémon types (Fire = red/orange, Water = blue, Grass = green, etc.).
- **Typography**: Clean sans-serif (`Inter` or system font stack) for numerical stats and labels.
- **Responsiveness**: Mobile-first design to enable comfortable access on phones while gaming.

### 4.2 Dashboard Components (`/`)

#### 4.2.1 Player Overview Card
- Player Name / Avatar.
- Badges earned or milestone indicators.
- **Active Team Grid (1 to 6 slots)**:
  - Sprite image.
  - Species name & Nickname.
  - Level, Typing pills, Gender.
  - Ability, Held Item, and Moveset (expandable details).
  - Status indicator (Healthy / Low HP warning).

#### 4.2.2 Graveyard / Casualties Section
- Summary metric: **Total Deaths**.
- Card grid or list displaying fainted Pokémon:
  - Grayscale or dimmed sprite.
  - Cause of death / Location fallen (e.g., *"Lost to Gym 3 - Level 24"*).
  - Level at the time of fainting.

---

### 4.3 Type Effectiveness Module (`/types`)
- **Attacking Mode**: Select a move type to view what it deals 2×, 1×, 0.5×, or 0× damage against.
- **Defending Mode**: Select up to two defending types to immediately calculate combined weaknesses (4×, 2×), neutral hits (1×), resistances (0.5×, 0.25×), and immunities (0×).

---

### 4.4 Damage Calculator Module (`/calc`)
- **Attacker Inputs**: Attacking Pokémon species/base stats, Level, Nature modifier, Move (Base Power + Type), Stat stage boost (-6 to +6).
- **Defender Inputs**: Defending Pokémon species, Level, Nature modifier, Typing, Stat stage boost (-6 to +6).
- **Battle Conditions**: Weather (Sun, Rain, Sand, Snow), Critical Hit checkbox, STAB toggle.
- **Output**: Minimum and maximum estimated damage percentages against target max HP, with a kill range indicator (e.g., *"Guaranteed 2HKO"*).

---

## 5. Data Design & Schemas

Data will be stored as JSON objects within the client application.

### 5.1 Player & Team Schema
```typescript
interface PlayerRun {
  playerId: string;
  playerName: string;
  avatarUrl?: string;
  party: PokemonEntry[];
  graveyard: PokemonEntry[];
  createdAt: string;
  updatedAt: string;
}

interface PokemonEntry {
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
```

### 5.2 Type Chart Data Matrix
A static lookup matrix stored as a structured JSON/TS map:
```typescript
type PokemonType =
  | "Normal" | "Fire" | "Water" | "Grass" | "Electric" | "Ice"
  | "Fighting" | "Poison" | "Ground" | "Flying" | "Psychic" | "Bug"
  | "Rock" | "Ghost" | "Dragon" | "Steel" | "Dark" | "Fairy";

type TypeEffectivenessMap = Record<PokemonType, Record<PokemonType, number>>;
```

---

## 6. Non-Functional Requirements

1. **Performance**: Initial page load under 1.5 seconds; static assets served via CDN edge nodes.
2. **Offline Usability**: All core features (Type Chart, Damage Calculator, Local Team tracking) must work without an active internet connection once loaded.
3. **Data Portability**: Users must be able to export their team state as a `.json` file and import it on any device to resume tracking.
4. **Browser Compatibility**: Full functional compatibility across modern evergreen browsers (Chrome, Firefox, Safari, Edge, mobile browsers).