import { io, Socket } from "socket.io-client";
import type {
  GameClientToServerEvents,
  GameServerToClientEvents,
  GameEvent,
} from "@game-hub/contracts";

export type GameSocket = Socket<GameServerToClientEvents, GameClientToServerEvents>;

export interface GameChannelOptions {
  url: string;
  namespace: string;
  joinToken: string; // Required for authentication
  autoConnect?: boolean;
}

export type GameStateCallback = (state: unknown) => void;
export type GameEventCallback = (event: GameEvent) => void;

/**
 * Helper to create a game channel connection
 */
export function connectGame(options: {
  baseUrl: string;
  wsNamespace: string;
  joinToken: string;
}): GameChannel {
  return new GameChannel({
    url: options.baseUrl,
    namespace: options.wsNamespace,
    joinToken: options.joinToken,
    autoConnect: true,
  });
}

export class GameChannel {
  private socket: GameSocket;
  private stateListeners: Set<GameStateCallback> = new Set();
  private eventListeners: Set<GameEventCallback> = new Set();

  constructor(options: GameChannelOptions) {
    // Normalize URL: remove trailing slash and ensure namespace doesn't start with slash
    const baseUrl = options.url.replace(/\/$/, "");
    const namespace = options.namespace.replace(/^\//, "");
    const fullUrl = `${baseUrl}/${namespace}`;
    
    this.socket = io(fullUrl, {
      autoConnect: options.autoConnect ?? false,
      transports: ["websocket", "polling"],
      auth: {
        token: options.joinToken,
      },
    }) as GameSocket;

    this.setupListeners();
  }

  private setupListeners(): void {
    this.socket.on("game:state", (state) => {
      this.stateListeners.forEach((cb) => cb(state));
    });

    this.socket.on("game:event", (event) => {
      this.eventListeners.forEach((cb) => cb(event));
    });
  }

  connect(): void {
    this.socket.connect();
  }

  disconnect(): void {
    this.socket.disconnect();
  }

  get connected(): boolean {
    return this.socket.connected;
  }

  sendAction(event: GameEvent): void {
    this.socket.emit("game:action", event);
  }

  onState(callback: GameStateCallback): () => void {
    this.stateListeners.add(callback);
    return () => this.stateListeners.delete(callback);
  }

  onEvent(callback: GameEventCallback): () => void {
    this.eventListeners.add(callback);
    return () => this.eventListeners.delete(callback);
  }

  onConnect(callback: () => void): () => void {
    this.socket.on("connect", callback);
    return () => this.socket.off("connect", callback);
  }

  onDisconnect(callback: (reason: string) => void): () => void {
    this.socket.on("disconnect", callback);
    return () => this.socket.off("disconnect", callback);
  }
}
