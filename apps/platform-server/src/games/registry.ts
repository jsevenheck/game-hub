import type { Server } from "socket.io";
import type { GameDefinition } from "@game-hub/contracts";

/**
 * Game registry for server-side game handlers.
 * Games register themselves here to enable their Socket.IO namespaces.
 */

export interface GameServerHandler {
  definition: GameDefinition;
  register: (io: Server, namespace: string) => void;
}

const gameHandlers = new Map<string, GameServerHandler>();

export function registerGame(handler: GameServerHandler): void {
  gameHandlers.set(handler.definition.id, handler);
  console.log(`[games] Registered game: ${handler.definition.name} (${handler.definition.id})`);
}

export function getGame(gameId: string): GameServerHandler | undefined {
  return gameHandlers.get(gameId);
}

export function getAllGames(): GameDefinition[] {
  return Array.from(gameHandlers.values()).map((h) => h.definition);
}

export function initializeGameNamespaces(io: Server): void {
  for (const [gameId, handler] of gameHandlers.entries()) {
    const namespace = `/game/${gameId}`;
    handler.register(io, namespace);
    console.log(`[games] Initialized namespace: ${namespace}`);
  }
}

// Games can be registered here:
// Example:
// import { werwolfHandler } from "@game-hub/werwolf-server";
// registerGame(werwolfHandler);
