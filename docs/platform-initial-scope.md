# Platform Initial Scope

This document captures the first platform iteration: party creation/join, lobby
state, player roles, and game start. It is meant as an implementation guide for
server, SDK, and web.

## Goals
- Create and join parties.
- Maintain a lobby state with players and roles.
- Allow host to start the game and broadcast state to all clients.

## Non-Goals (for now)
- Persistence across server restarts.
- Matchmaking or public lobbies.
- In-game logic (lives inside each game package).

## Party Flow
1. Host creates a party.
2. Server returns a `partyId` and a `hostToken`.
3. Host shares the `partyId` with others.
4. Players join with `partyId` and choose a display name.
5. Lobby state updates for all connected clients.
6. Host assigns roles and starts the game.

## Roles
- Roles are game-defined strings stored in the lobby state.
- Only the host can set roles.
- Role assignment is part of the pre-game lobby state.

## State Shape (high level)
- Party
  - `id`
  - `status`: `lobby | in_game`
  - `hostId`
  - `players[]`: `id`, `name`, `role?`, `connected`
  - `gameId`

## Socket Events (proposed)
- Client -> Server
  - `party:create` (gameId, name)
  - `party:join` (partyId, name)
  - `party:leave`
  - `party:setRole` (playerId, role)
  - `party:start`
- Server -> Client
  - `party:state` (full state payload)
  - `party:error` (code, message)

## HTTP Endpoints (optional)
- `POST /party` -> create party (returns `partyId`, `hostToken`)
- `POST /party/:id/join` -> join party (returns `playerToken`)

## SDK Surface (proposed)
- `createParty(gameId, name)` -> partyId + host token
- `joinParty(partyId, name)` -> partyId + player token
- `connect(partyId, token)` -> socket connection + state listener

## Web UI (minimal)
- Create/join page
- Lobby view with player list, role assignment, start button (host only)
- Game host view for embedded game UI

## Acceptance
- Two browser sessions can create/join a party and see live lobby updates.
- Host can assign roles and start the game; all clients receive state change.
