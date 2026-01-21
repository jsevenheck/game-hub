# Docker Setup for Games

This guide explains how to add Docker support for individual games in the `games/` folder.

## Overview

The base Docker setup (in `docker-compose.yml` and `docker-compose.prod.yml`) handles the platform services:
- `platform-web` - Frontend UI
- `platform-server` - Backend API + Socket.IO

Individual games can optionally have their own Docker services if they need backend components beyond what the platform provides.

## Do You Need Docker for Your Game?

### ✅ You DON'T need Docker for your game if:
- Your game only has a frontend (web) package that gets embedded in the platform
- Your game logic runs entirely client-side
- The platform-server handles all your game's backend needs

**Example structure:**
```
games/
  myGame/
    web/          # Frontend only - no Docker needed
      package.json
      src/
```

### ✅ You DO need Docker for your game if:
- Your game has a separate backend service with custom logic
- Your game needs a dedicated database or other infrastructure
- Your game requires specific runtime dependencies

**Example structure:**
```
games/
  myGame/
    web/          # Frontend
      package.json
    server/       # Backend service - needs Docker
      package.json
      Dockerfile
```

## Adding Docker for a Game

### Option 1: Manual docker-compose.override.yml (Recommended)

Create a `docker-compose.override.yml` file in the repository root (this file is git-ignored by default):

```yaml
version: '3.8'

services:
  # Your game's backend service
  myGame-server:
    build:
      context: .
      dockerfile: games/myGame/server/Dockerfile
    container_name: mygame-server
    ports:
      - "3001:3000"  # Avoid port conflicts
    environment:
      - NODE_ENV=development
      - PORT=3000
    volumes:
      - ./games/myGame/server/src:/app/games/myGame/server/src
      - ./packages:/app/packages
    networks:
      - game-hub-network
    depends_on:
      - platform-server
    restart: unless-stopped

  # Optional: Database for your game
  myGame-db:
    image: postgres:16-alpine
    container_name: mygame-db
    environment:
      - POSTGRES_DB=mygame
      - POSTGRES_USER=mygame
      - POSTGRES_PASSWORD=mygame_dev
    ports:
      - "5433:5432"  # Use non-standard port to avoid conflicts
    volumes:
      - mygame-db-data:/var/lib/postgresql/data
    networks:
      - game-hub-network

volumes:
  mygame-db-data:

networks:
  game-hub-network:
    external: true  # Use the existing network from docker-compose.yml
```

**Usage:**
```bash
# Docker Compose automatically merges docker-compose.yml with docker-compose.override.yml
docker-compose up

# Your game service will start alongside platform services
```

### Option 2: Separate Compose File

Create a dedicated compose file for your game:

**File:** `games/myGame/docker-compose.game.yml`
```yaml
version: '3.8'

services:
  myGame-server:
    build:
      context: ../..  # Repository root
      dockerfile: games/myGame/server/Dockerfile
    container_name: mygame-server
    ports:
      - "3001:3000"
    environment:
      - NODE_ENV=development
    volumes:
      - ./server/src:/app/games/myGame/server/src
    networks:
      - game-hub-network

networks:
  game-hub-network:
    external: true
```

**Usage:**
```bash
# Start platform first
docker-compose up -d

# Then start your game
docker-compose -f games/myGame/docker-compose.game.yml up
```

### Option 3: One Unified Compose File (Not Recommended)

You can edit `docker-compose.yml` directly to add game services, but this requires manual updates every time you add a game and creates merge conflicts.

## Game Dockerfile Template

If your game needs a backend service, here's a template Dockerfile:

**File:** `games/myGame/server/Dockerfile`
```dockerfile
# Development Dockerfile for game backend

FROM node:22.12.0-alpine

# Install pnpm globally
RUN npm install -g pnpm@10.28.1

WORKDIR /app

# Copy workspace configuration
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY tsconfig.base.json tsconfig.json ./

# Copy workspace dependencies
COPY packages ./packages
COPY games/myGame ./games/myGame

# Install dependencies
RUN pnpm install --frozen-lockfile

WORKDIR /app/games/myGame/server

# Expose port
EXPOSE 3000

# Start development server
CMD ["pnpm", "dev"]
```

**File:** `games/myGame/server/Dockerfile.prod` (Production)
```dockerfile
# Multi-stage production build

FROM node:22.12.0-alpine AS builder

RUN npm install -g pnpm@10.28.1

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY tsconfig.base.json tsconfig.json ./
COPY packages ./packages
COPY games/myGame ./games/myGame

RUN pnpm install --frozen-lockfile

WORKDIR /app/games/myGame/server
RUN pnpm build

# Production stage
FROM node:22.12.0-alpine AS production

RUN npm install -g pnpm@10.28.1

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY tsconfig.base.json ./
COPY packages ./packages
COPY games/myGame/server/package.json ./games/myGame/server/

RUN pnpm install --frozen-lockfile --prod --ignore-scripts

COPY --from=builder /app/games/myGame/server/dist ./games/myGame/server/dist

WORKDIR /app/games/myGame/server

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "dist/index.js"]
```

## Recommended Pattern

We recommend **Option 1** (docker-compose.override.yml) for most use cases:

1. **Automatic merging**: Docker Compose automatically loads `docker-compose.override.yml`
2. **Git-friendly**: Override file is in `.gitignore` by default (add `!docker-compose.override.yml` to commit it)
3. **No conflicts**: Changes to base setup don't affect game services
4. **Clean separation**: Game services are optional and don't clutter the main compose file

### Adding to Git

If you want to commit your game's Docker setup:

```bash
# Create a template override file
cp docker-compose.override.yml docs/docker/docker-compose.override.example.yml

# Add to git
git add docs/docker/docker-compose.override.example.yml

# Users copy it locally
cp docs/docker/docker-compose.override.example.yml docker-compose.override.yml
```

## Port Management

To avoid port conflicts when adding multiple game services:

| Service | Suggested Port Range | Example |
|---------|---------------------|---------|
| platform-web | 5173 | Fixed |
| platform-server | 3000 | Fixed |
| Game 1 backend | 3001 | myGame-server: 3001:3000 |
| Game 2 backend | 3002 | otherGame-server: 3002:3000 |
| Game databases | 5432, 5433, ... | postgres: 5432:5432 |
| Game redis | 6379, 6380, ... | redis: 6379:6379 |

## Examples

### Example 1: Frontend-only Game (No Docker needed)

```
games/
  simpleGame/
    web/
      package.json
      src/
        index.ts
```

✅ **No Docker configuration needed** - game runs inside platform-web

### Example 2: Game with Backend Service

```
games/
  complexGame/
    web/
      package.json
    server/
      package.json
      Dockerfile
      Dockerfile.prod
      src/
```

Create `docker-compose.override.yml`:
```yaml
version: '3.8'

services:
  complexGame-server:
    build:
      context: .
      dockerfile: games/complexGame/server/Dockerfile
    ports:
      - "3001:3000"
    networks:
      - game-hub-network
```

Run: `docker-compose up`

### Example 3: Game with Database

```
games/
  mmoGame/
    web/
    server/
      Dockerfile
    db/
      init.sql
```

Create `docker-compose.override.yml`:
```yaml
version: '3.8'

services:
  mmoGame-server:
    build:
      context: .
      dockerfile: games/mmoGame/server/Dockerfile
    ports:
      - "3001:3000"
    environment:
      - DATABASE_URL=postgres://mmo:mmo@mmoGame-db:5432/mmo
    depends_on:
      - mmoGame-db
    networks:
      - game-hub-network

  mmoGame-db:
    image: postgres:16-alpine
    environment:
      - POSTGRES_DB=mmo
      - POSTGRES_USER=mmo
      - POSTGRES_PASSWORD=mmo_dev
    ports:
      - "5433:5432"
    volumes:
      - ./games/mmoGame/db/init.sql:/docker-entrypoint-initdb.d/init.sql
      - mmoGame-data:/var/lib/postgresql/data
    networks:
      - game-hub-network

volumes:
  mmoGame-data:

networks:
  game-hub-network:
    external: true
```

## FAQ

**Q: Do I need to modify docker-compose.yml every time I add a game?**  
A: No! Use `docker-compose.override.yml` for game-specific services. Docker Compose merges them automatically.

**Q: Can games share the platform's Docker network?**  
A: Yes! Set `external: true` for the `game-hub-network` in your override file.

**Q: What if my game only has a web component?**  
A: No Docker setup needed - your game's web package will be built as part of the platform.

**Q: Can I have multiple games running at once?**  
A: Yes! Add all game services to `docker-compose.override.yml` with unique ports.

**Q: How do I test my game in isolation?**  
A: Create a separate `docker-compose.game.yml` file and use `docker-compose -f` to run it independently.

## Best Practices

1. **Use override files** instead of modifying base compose files
2. **Namespace your services** (e.g., `gameName-server`, not just `server`)
3. **Use unique ports** to avoid conflicts (3001+, 5433+, etc.)
4. **Keep Dockerfiles in game folders** (e.g., `games/myGame/server/Dockerfile`)
5. **Document game requirements** in the game's README
6. **Use health checks** for game services
7. **Share networks** by using `external: true` for `game-hub-network`

## Troubleshooting

### Network not found error
```bash
# Make sure platform is running first
docker-compose up -d

# Then start game services
docker-compose -f games/myGame/docker-compose.game.yml up
```

### Port already in use
Check port mappings in your override file and use a different host port:
```yaml
ports:
  - "3002:3000"  # Change 3001 to 3002
```

### Game can't reach platform-server
Make sure both services are on the same network:
```yaml
networks:
  - game-hub-network
```

## Support

For more Docker help, see:
- [DOCKER.md](DOCKER.md) - Platform Docker guide
- [Docker Compose documentation](https://docs.docker.com/compose/)
