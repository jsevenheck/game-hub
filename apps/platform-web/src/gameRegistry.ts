import type { Component } from "vue";
import type { GameDefinition } from "@game-hub/platform-sdk";

/**
 * Game registry for client-side game UI components.
 * Games register their Vue components here to be embedded in the platform.
 */

export interface GameUIRegistration {
  definition: GameDefinition;
  component: Component;
}

const gameComponents = new Map<string, GameUIRegistration>();

export function registerGameUI(registration: GameUIRegistration): void {
  gameComponents.set(registration.definition.id, registration);
  console.log(`[games] Registered UI: ${registration.definition.name} (${registration.definition.id})`);
}

export function getGameUI(gameId: string): GameUIRegistration | undefined {
  return gameComponents.get(gameId);
}

export function getAllGameDefinitions(): GameDefinition[] {
  return Array.from(gameComponents.values()).map((r) => r.definition);
}

// Games can be registered here:
// Example:
// import WerwolfGame from "@game-hub/werwolf-web";
// registerGameUI({
//   definition: { id: "werwolf", name: "Werwolf", minPlayers: 5, maxPlayers: 20 },
//   component: WerwolfGame,
// });
