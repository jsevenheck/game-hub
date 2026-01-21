# Game Hub

Monorepo for the platform (server + web) and multiple games that plug into it.

## Structure
- `apps/platform-server`: Fastify + Socket.IO backend that hosts parties and routes game events.
- `apps/platform-web`: Vue app that hosts parties and embeds game UIs.
- `packages/contracts`: Shared types and validation used by server and client.
- `packages/platform-sdk`: Client SDK for games to talk to the platform.
- `games/<game>/<package>`: Individual games split into workspace packages (e.g. `web`, `server`, `shared`).

## Adding a game
1. Create a new game folder with one or more packages:
   - Example: `games/werwolf/web`, `games/werwolf/server`
2. Add a `package.json` per package so pnpm picks it up via `games/*/*`.
3. Register the game in:
   - `apps/platform-server/src/games/registry.ts`
   - `apps/platform-web/src/gameRegistry.ts`

## Scripts
- `pnpm dev`: Run all packages in dev mode.
- `pnpm build`: Build all packages.
- `pnpm typecheck`: Typecheck all packages.
- `pnpm clean`: Clean all packages.

## Requirements
- Node `>=22.12.0`
- pnpm (see `package.json` `packageManager`)

## Docker Support

Docker is fully supported for both development and production environments. See [docs/docker/DOCKER.md](./docs/docker/DOCKER.md) for detailed instructions.

### Quick Start with Docker

**Development:**
```bash
docker-compose up
```
- Frontend: http://localhost:5173
- Backend: http://localhost:3000

**Production:**
```bash
docker-compose -f docker-compose.prod.yml up --build
```
- Frontend: http://localhost
- Backend: http://localhost:3000
