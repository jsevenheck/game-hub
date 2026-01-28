# Platform MVP Smoke Test

This document describes manual smoke tests to verify the platform's core functionality, including reconnection and stable player identity.

## Prerequisites

- Node.js 22+ installed
- pnpm installed

## Setup

```bash
pnpm install
pnpm dev
```

This starts:
- **Platform Server** on `http://localhost:3000`
- **Platform Web** on `http://localhost:5173`

---

## Test 1: Basic Party Flow

### Steps

1. Open **Tab A** at `http://localhost:5173`
2. Enter name "Host" and click **Create Party**
3. Note the party code (e.g., `ABC123`)
4. Open **Tab B** at `http://localhost:5173`
5. Enter name "Player" and the party code, click **Join**

### Expected Results

- ✅ Both tabs show the Party Lobby
- ✅ Tab A shows "Host" badge next to the host player
- ✅ Tab A shows "You" badge, Tab B shows "You" badge on their respective players
- ✅ Players list shows both players with `connected: true`

---

## Test 2: Reconnection with Stable Identity

### Steps

1. Complete Test 1 (two tabs in a party)
2. Note the `playerId` from the browser console or localStorage:
   ```js
   localStorage.getItem('game-hub:player-id')
   ```
3. **Refresh Tab B** (the non-host player)
4. Wait for reconnection (automatic)

### Expected Results

- ✅ Tab B rejoins the party automatically
- ✅ The `playerId` is the **same** as before refresh
- ✅ The player's `connected` status returns to `true`
- ✅ Host relationship is preserved (Tab A is still host)
- ✅ No duplicate players appear in the list

### Verify in Console

```js
// Should be the same before and after refresh
localStorage.getItem('game-hub:player-id')
localStorage.getItem('game-hub:platform-token')
```

---

## Test 3: Host Reconnection

### Steps

1. Complete Test 1 (two tabs in a party)
2. **Refresh Tab A** (the host)
3. Wait for reconnection

### Expected Results

- ✅ Tab A rejoins and is still the host
- ✅ `hostId` matches Tab A's `playerId`
- ✅ Both players show as connected

---

## Test 4: Game Selection and Start

### Steps

1. Complete Test 1 (two tabs in a party)
2. In Tab A (host), select a game (e.g., "Werwolf")
3. Observe the game selection state

### Expected Results

- ✅ Selected game is highlighted in Tab A
- ✅ Tab B shows the selected game in "Selected Game" section
- ✅ If game is not implemented, "Coming Soon" badge appears
- ✅ Start button is **enabled** even for unimplemented games (placeholder mode)

---

## Test 5: Game Started Flow (Placeholder Mode)

> **Note:** No games are registered on the server yet. This tests the placeholder flow.

### Steps

1. Complete Test 1 (two tabs in a party)
2. As host (Tab A), select any game (e.g., "Werwolf")
3. Note the info message: "This game will run in placeholder mode"
4. Click **Start Game**
5. Observe both tabs

### Expected Results

- ✅ Both tabs transition to the Game View
- ✅ GameHost shows placeholder UI with:
  - Game ID (e.g., "werwolf")
  - Session ID (UUID)
  - WebSocket Namespace (e.g., `/g/werwolf`)
- ✅ Party status changes to `in_game`
- ✅ No error is shown

### Verify in Console

```js
// Check the active game session
console.log(JSON.stringify(partyStore.activeGameSession, null, 2))
```

### Expected `party:gameStarted` Payload

```json
{
  "gameId": "werwolf",
  "sessionId": "uuid-v4-session-id",
  "wsNamespace": "/g/werwolf",
  "joinToken": "uuid-v4-per-player-token"
}
```

- ✅ `sessionId` is a valid UUID
- ✅ `wsNamespace` follows `/g/<gameId>` format
- ✅ `joinToken` is unique per player (check both tabs)
- ✅ GameHost component renders with placeholder

---

## Test 6: Disconnect Behavior

### Steps

1. Complete Test 1
2. Close Tab B (simulates disconnect)
3. Observe Tab A

### Expected Results

- ✅ Player from Tab B shows `connected: false`
- ✅ Player is NOT removed from the list
- ✅ "Offline" badge appears next to disconnected player

---

## Debugging Tips

### Check localStorage

```js
// Platform token (for reconnection auth)
localStorage.getItem('game-hub:platform-token')

// Stable player ID
localStorage.getItem('game-hub:player-id')

// Party ID
localStorage.getItem('game-hub:party-id')
```

### Clear State

```js
localStorage.removeItem('game-hub:platform-token')
localStorage.removeItem('game-hub:player-id')
localStorage.removeItem('game-hub:party-id')
```

### Server Logs

Watch the terminal running `pnpm dev` for:
- `[platform] Client connected: <socket.id>`
- `[platform] Player <playerId> reconnected to party <partyId>`

---

## Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| Duplicate players after refresh | Token not sent in handshake | Check `socket.auth` is set |
| Host lost after refresh | `hostId` using `socket.id` | Verify `hostId` uses stable `playerId` |
| Cannot rejoin party | Token expired or invalid | Clear localStorage and rejoin |
| Placeholder not showing | `activeGameSession` not set | Verify `party:gameStarted` was received |
