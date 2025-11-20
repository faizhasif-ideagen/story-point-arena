# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Story Point Arena is a **real-time multiplayer** browser-based team combat game where ALL players fight simultaneously on screen. Players connect from different devices via WebSocket, join rooms using codes, and battle in real-time. Players with the same story point values (Fibonacci sequence) form teams that battle left vs right. Each player has randomly generated stats, and team coordination with fast-paced movement determines victory.

### Multiplayer Architecture
- **Backend**: Node.js + Express + Socket.io server managing rooms and real-time events
- **Frontend**: Vanilla JavaScript with Socket.io client for WebSocket communication
- **Rooms**: Unique 6-character codes for isolated game sessions
- **Real-time Sync**: All attacks, damage, and game state synchronized across clients

## Development Commands

### Running Multiplayer (Recommended)
```bash
# Install dependencies
npm install

# Start server (production)
npm start

# Start server (development with auto-reload)
npm run dev
```

Server runs on http://localhost:3000 (or PORT environment variable)

### Running Local Mode
```bash
# Open index.html directly in a web browser
# Works offline without the Node.js server
```

## Architecture

### High-Level Structure

Single-page application with vanilla JavaScript, no frameworks or build tools. All game logic runs client-side in the browser.

### Key Files

- `index.html` - Main application structure with multiple screen states (Login, Network Lobby, Estimation, Setup, Battle, Winner, Rankings)
- `styles.css` - Complete styling including animations, responsive layout, visual effects, and multiplayer UI
- `game.js` - All game logic including state management, team system, AI behavior, battle mechanics, rendering, and network event handlers
- `network.js` - Client-side networking manager using Socket.io for real-time communication
- `server.js` - Node.js backend server with Express and Socket.io for room management and event broadcasting
- `package.json` - Node.js dependencies and scripts

### Core Concepts

**Game State Management**: The game uses a finite state machine with multiple states:
- LOGIN: Choose between Network Play or Local Play (first screen)
- NETWORK_LOGIN: Multiplayer lobby with embedded AI estimation at top (host only), create/join rooms, add players
- ESTIMATION: AI-powered story point estimation (shown before setup in local mode)
- SETUP: Player registration with story points selection (local mode)
- BATTLE: Real-time team combat on HTML5 canvas with ALL players displayed
- HORSE_RACE: Team-based clicking race with hurdles
- WINNER: Winning team display
- RANKINGS: Player statistics and leaderboard

**Multiplayer Mode** (`isNetworkMode` flag):
- Uses Socket.io for real-time bidirectional communication
- Room-based sessions with unique 6-character codes
- Host controls battle start
- All events (attacks, damage, battle end) synchronized across clients
- Graceful handling of player disconnections

**Team System**:
- Supports 2-20 players total
- Players grouped by story point values into teams
- Teams divided into Left (lower story points) vs Right (higher story points)
- Same story point number = same team (cannot attack each other)
- All players spawn and fight simultaneously on screen

**Player Stats System**:
- Base stats: 20 HP, 5 damage, 80 attack range
- 5 random stat levels (1-5) applied to each player at creation:
  - Stat 0: HP bonus (level × 3)
  - Stat 1: Damage bonus (level × 2)
  - Stat 2: Combined HP and damage (level × 1 each)
  - Stat 3: Attack Range (level × 15) - affects how far they can attack
  - Stat 4: Extra damage (level × 1.5)
- Stats are randomly generated and permanent for each player
- Attack range varies from 95 to 155 pixels based on stat level

**Battle Mechanics**:
- Canvas-based rendering at 1400×800px with grid background and center dividing line
- ALL knights displayed on screen simultaneously
- Knights rendered as shield + helmet with cross emblem (team colored)
- First knight (index 0) is player-controlled with arrow keys + WASD and space to attack
- All other knights are AI-controlled with autonomous combat behavior
- AI seeks closest enemy, moves toward them, and attacks when in range
- Very slow, tactical movement: 1.25 pixels per frame
- **Directional Attacks**: Knights attack in a forward-facing 60° cone
  - Must face target to hit them (tracked by movement direction)
  - Attack range varies per player (80-155 pixels based on stats)
  - Visual: Semi-transparent cone shows attack arc when attacking
  - Hit detection: Checks both distance AND angle to target
- Attack cooldown: 120 frames (~2 seconds at 60fps)
- Team-based: Same team members cannot damage each other
- Battle ends when all members of one team are defeated

### Data Flow

**Network Play:**
1. Mode Selection → Choose Network Play
2. Network Lobby → Host sees AI estimation at top (optional) → Create/join room → Add players
3. Game Mode Selection → Host chooses Battle Arena or Horse Race
4. Battle/Race Start → Teams created by story point grouping → Teams split left/right
5. Gameplay → All players participate simultaneously
6. Game End → Winning team determined → Stats displayed

**Local Play:**
1. Mode Selection → Choose Local Play
2. Estimation → AI analyzes task description and recommends story points (optional)
3. Setup → Players added with name + story points → Stats generated → Player list updates
4. Game Mode Selection → Choose Battle Arena or Horse Race
5. Battle/Race Start → Teams created by story point grouping → Teams split left/right
6. Gameplay → All players participate simultaneously
7. Game End → Winning team determined → Stats displayed

### State Management

Global `game` object manages all state:
- `players[]`: Array of all Player instances with stats
- `teams{}`: Object with `left` and `right` arrays containing team players
- `battleKnights[]`: ALL Knight instances displayed and active simultaneously
- `keys{}`: Keyboard input tracking for player-controlled knight
- Canvas animation loop using requestAnimationFrame

## Classes

**Game**: Main controller managing screens, team creation, battle coordination, AI updates, and network event handlers

**Player**: Stores name, story points, generated stats, and network identifiers (id, socketId for multiplayer)

**Knight**: Battle entity with position, HP, team affiliation, movement (player OR AI), attack logic, rendering, and AI behavior

**NetworkManager** (network.js): Singleton managing Socket.io connection, room operations, and event broadcasting/receiving

## Network Events

### Server → Client
- `players-updated`: Room player list changed
- `player-joined`: New player connected
- `player-left`: Player disconnected
- `battle-started`: Host started battle
- `knight-attacked`: Knight performed attack
- `knight-damaged`: Knight took damage
- `battle-ended`: Battle finished
- `you-are-host`: Client became room host

### Client → Server
- `create-room`: Create new game room
- `join-room`: Join existing room
- `add-player`: Add character to room
- `remove-player`: Remove character
- `start-battle`: Host starts game
- `knight-attack`: Broadcast attack
- `knight-damage`: Broadcast damage
- `battle-ended`: Broadcast battle end
- `leave-room`: Exit current room

## Configuration

No configuration files needed. Game settings are hardcoded:
- Max players: 20
- Canvas size: 1400×800
- Knight size: 35 pixels
- Base HP: 20
- Base damage: 5
- Base attack range: 80 pixels (varies 95-155 with stats)
- Movement speed: 1.25 pixels/frame (very slow, tactical pace)
- Attack cone angle: 60 degrees (±30° from facing direction)
- Attack cooldown: 120 frames (~2 seconds)
- AI think interval: 15 frames (how often AI re-evaluates targets)

## Dependencies

### Frontend (Client)
- Socket.io client (loaded from server at runtime)
- Pure vanilla JavaScript - no frameworks

### Backend (Server)
- Node.js (v14+)
- express: ^4.18.2 - Web server framework
- socket.io: ^4.6.1 - WebSocket library for real-time communication

### Dev Dependencies
- nodemon: ^3.0.1 - Auto-restart server during development

## Additional Notes

- Story points (Fibonacci numbers) determine team membership - players with same number are teammates
- Teams are auto-balanced by splitting story point groups between left and right
- Player only controls first knight (index 0), all others have autonomous AI
- AI behavior: finds closest enemy, pursues them, attacks when in range
- Team-based attack validation prevents friendly fire
- All knights move and attack simultaneously creating chaotic, fast-paced battles
- Knights display story point badge below name for team identification
- Game is fully self-contained in three files with no network requests or external assets
