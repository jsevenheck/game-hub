export { PlatformChannel } from "./platformChannel.js";
export type {
  PlatformChannelOptions,
  PlatformSocket,
  StateCallback,
  JoinedCallback,
  ErrorCallback,
} from "./platformChannel.js";

export { GameChannel } from "./gameChannel.js";
export type {
  GameChannelOptions,
  GameSocket,
  GameStateCallback,
  GameEventCallback,
} from "./gameChannel.js";

// Re-export contracts for convenience
export * from "@game-hub/contracts";
