# Platform Initial Scope

This document captures the first platform iteration: party creation/join, lobby
state, player roles, and game start. It is meant as an implementation guide for
server, SDK, and web.

## Goals
- Create and join parties.
- Maintain a lobby state with players and roles.
- Allow host to select a game and start it; broadcast state to all clients.
- Stable player identity across reconnections.

## Non-Goals (for now)
- Persistence across server restarts.
- Matchmaking or public lobbies.
- In-game logic (lives inside each game package).

## Party Flow
1. Host creates a party (no game selected yet).
2. Server returns a `partyId`, `playerId`, and `token` (for reconnection).
3. Host shares the `partyId` with others.
4. Players join with `partyId` and choose a display name; receive their own `playerId` and `token`.
5. Lobby state updates for all connected clients via `party:state`.
6. Host selects a game via `party:selectGame`.
7. Host starts the game; server generates a `sessionId` and per-player `joinToken`s.
8. Each player receives `party:gameStarted` with `{gameId, sessionId, wsNamespace, joinToken}`.
9. Clients connect to the game namespace (`/g/<gameId>`) using their `joinToken`.

## Stable Identity
- Each player is assigned a UUID-based `playerId` on first join (NOT socket.id).
- The `token` returned in `party:joined` is stored client-side (localStorage).
- On reconnect, the client passes the token in the Socket.IO `auth` handshake.
- Server looks up the player by token and restores their identity.

## Roles
- Roles are game-defined strings stored in the lobby state.
- Only the host can set roles.
- Role assignment is part of the pre-game lobby state.

## State Shape (high level)
- Party
  - `id`: string (UUID)
  - `status`: `lobby | in_game`
  - `hostId`: string (playerId of host)
  - `players[]`: `id`, `name`, `role?`, `connected`
  - `gameId`: string | null (selected game, null until host picks one)
  - `sessionId`: string | null (set when game starts)

## Socket.IO Namespaces
- `/platform` — party management (create, join, lobby, start)
- `/g/<gameId>` — game-specific events (e.g., `/g/tic-tac-toe`)

## Socket Events (implemented)

### Client → Server (on `/platform`)
| Event | Payload | Description |
|-------|---------|-------------|
| `party:create` | `{ name }` | Create a new party; caller becomes host |
| `party:join` | `{ partyId, name }` | Join an existing party |
| `party:leave` | — | Leave the current party |
| `party:setRole` | `{ playerId, role }` | Host assigns a role to a player |
| `party:selectGame` | `{ gameId }` | Host selects the game to play |
| `party:start` | — | Host starts the game |

### Server → Client (on `/platform`)
| Event | Payload | Description |
|-------|---------|-------------|
| `party:joined` | `{ partyId, playerId, token }` | Confirmation after create/join; includes auth token |
| `party:state` | `PartyStatePayload` | Full lobby state broadcast |
| `party:gameStarted` | `{ gameId, sessionId, wsNamespace, joinToken }` | Sent to each player when game starts |
| `party:error` | `{ code, message }` | Error notification |

## HTTP Endpoints
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check |
| `GET` | `/games` | List registered games with availability |

## SDK Surface (`@game-hub/platform-sdk`)

### PlatformChannel (connects to `/platform`)
```ts
createParty(name: string): void
joinParty(partyId: string, name: string): void
leaveParty(): void
selectGame(gameId: string): void
startGame(): void
onState(cb: (state: PartyStatePayload) => void): void
onJoined(cb: (data: { partyId, playerId, token }) => void): void
onGameStarted(cb: (data: GameStartedPayload) => void): void
onError(cb: (err: { code, message }) => void): void
setToken(token: string): void   // for reconnection auth
```

### GameChannel (connects to `/g/<gameId>`)
```ts
constructor(gameId: string, joinToken: string)
send(event: string, payload: unknown): void
on(event: string, cb: (payload: unknown) => void): void
disconnect(): void
```

## Web UI (minimal)
- Create/join page
- Lobby view with player list, game selection, role assignment, start button (host only)
- "Coming Soon" badge for games not yet implemented on the server
- Game host view (`<GameHost>`) for embedded game UI

## Acceptance
- Two browser sessions can create/join a party and see live lobby updates.
- Refreshing a browser tab reconnects the player with the same identity.
- Host can select a game, assign roles, and start the game.
- All clients receive `party:gameStarted` with the correct `wsNamespace` and `joinToken`.
- Unimplemented games show "Coming Soon" and cannot be started.
