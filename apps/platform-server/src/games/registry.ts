import type { Server } from "socket.io";
import type { GameDefinition } from "@game-hub/contracts";

/**
 * Game registry for server-side game handlers.
 * Games register themselves here to enable their Socket.IO namespaces.
 * 
 * Convention: Game namespaces use /g/<gameId> format.
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

export function isGameRegistered(gameId: string): boolean {
  return gameHandlers.has(gameId);
}

export function getAllGames(): GameDefinition[] {
  return Array.from(gameHandlers.values()).map((h) => h.definition);
}

export function getGameNamespace(gameId: string): string {
  return `/g/${gameId}`;
}

export function initializeGameNamespaces(io: Server): void {
  if (gameHandlers.size === 0) {
    console.log("[games] No games registered. Server will run without game namespaces.");
    return;
  }

  for (const [gameId, handler] of gameHandlers.entries()) {
    const namespace = getGameNamespace(gameId);
    handler.register(io, namespace);
    console.log(`[games] Initialized namespace: ${namespace}`);
  }
}
