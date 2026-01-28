import { io, Socket } from "socket.io-client";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  CreatePartyPayload,
  JoinPartyPayload,
  SetRolePayload,
  SelectGamePayload,
  PartyStatePayload,
  PartyJoinedPayload,
  PartyErrorPayload,
  GameStartedPayload,
} from "@game-hub/contracts";

export type PlatformSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export interface PlatformChannelOptions {
  url: string;
  token?: string; // Auth token for reconnection
  autoConnect?: boolean;
}

export type StateCallback = (state: PartyStatePayload) => void;
export type JoinedCallback = (payload: PartyJoinedPayload) => void;
export type ErrorCallback = (error: PartyErrorPayload) => void;
export type GameStartedCallback = (payload: GameStartedPayload) => void;

export class PlatformChannel {
  private socket: PlatformSocket;
  private stateListeners: Set<StateCallback> = new Set();
  private joinedListeners: Set<JoinedCallback> = new Set();
  private errorListeners: Set<ErrorCallback> = new Set();
  private gameStartedListeners: Set<GameStartedCallback> = new Set();
  private reconnectListeners: Set<() => void> = new Set();
  private _token: string | undefined;

  constructor(options: PlatformChannelOptions) {
    this._token = options.token;
    
    // Connect to /platform namespace with auth token if available
    const baseUrl = options.url.replace(/\/$/, "");
    this.socket = io(`${baseUrl}/platform`, {
      autoConnect: options.autoConnect ?? false,
      transports: ["websocket", "polling"],
      auth: this._token ? { token: this._token } : undefined,
      // Reconnection with exponential backoff
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,      // Start with 1 second
      reconnectionDelayMax: 10000,  // Max 10 seconds between attempts
      randomizationFactor: 0.5,     // Add jitter to prevent thundering herd
    }) as PlatformSocket;

    this.setupListeners();
  }

  private setupListeners(): void {
    this.socket.on("party:state", (state) => {
      this.stateListeners.forEach((cb) => cb(state));
    });

    this.socket.on("party:joined", (payload) => {
      // Store token for future reconnects.
      // IMPORTANT: socket.id changes after reconnect/refresh, so we must send
      // the token in handshake auth to restore player identity on the server.
      this._token = payload.token;
      this.setToken(payload.token);
      this.joinedListeners.forEach((cb) => cb(payload));
    });

    this.socket.on("party:error", (error) => {
      this.errorListeners.forEach((cb) => cb(error));
    });

    this.socket.on("party:gameStarted", (payload) => {
      this.gameStartedListeners.forEach((cb) => cb(payload));
    });
  }

  /**
   * Get the current auth token
   */
  get token(): string | undefined {
    return this._token;
  }

  /**
   * Update auth token for future reconnects.
   * Socket.IO socket.id changes after every reconnect/refresh, so we must
   * send the platform token in handshake auth to restore player identity.
   */
  setToken(token: string): void {
    this._token = token;
    // Safely merge token into socket.auth for next connection/reconnect
    const existingAuth = (typeof this.socket.auth === "object" && this.socket.auth !== null)
      ? this.socket.auth
      : {};
    this.socket.auth = { ...existingAuth, token };
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

  get id(): string | undefined {
    return this.socket.id;
  }

  createParty(payload: CreatePartyPayload): void {
    this.socket.emit("party:create", payload);
  }

  joinParty(payload: JoinPartyPayload): void {
    this.socket.emit("party:join", payload);
  }

  leaveParty(): void {
    this.socket.emit("party:leave");
  }

  setRole(payload: SetRolePayload): void {
    this.socket.emit("party:setRole", payload);
  }

  selectGame(payload: SelectGamePayload): void {
    this.socket.emit("party:selectGame", payload);
  }

  startGame(): void {
    this.socket.emit("party:start");
  }

  onState(callback: StateCallback): () => void {
    this.stateListeners.add(callback);
    return () => this.stateListeners.delete(callback);
  }

  onJoined(callback: JoinedCallback): () => void {
    this.joinedListeners.add(callback);
    return () => this.joinedListeners.delete(callback);
  }

  onError(callback: ErrorCallback): () => void {
    this.errorListeners.add(callback);
    return () => this.errorListeners.delete(callback);
  }

  onGameStarted(callback: GameStartedCallback): () => void {
    this.gameStartedListeners.add(callback);
    return () => this.gameStartedListeners.delete(callback);
  }

  onConnect(callback: () => void): () => void {
    this.socket.on("connect", callback);
    return () => this.socket.off("connect", callback);
  }

  onDisconnect(callback: (reason: string) => void): () => void {
    this.socket.on("disconnect", callback);
    return () => this.socket.off("disconnect", callback);
  }

  onReconnect(callback: () => void): () => void {
    this.reconnectListeners.add(callback);
    // Socket.IO emits 'connect' on reconnect, so we track it separately
    const handler = () => {
      if (this._token) {
        // Only fire reconnect if we had a token (meaning we were previously connected)
        callback();
      }
    };
    this.socket.io.on("reconnect", handler);
    return () => {
      this.reconnectListeners.delete(callback);
      this.socket.io.off("reconnect", handler);
    };
  }

  onReconnectAttempt(callback: (attempt: number) => void): () => void {
    this.socket.io.on("reconnect_attempt", callback);
    return () => this.socket.io.off("reconnect_attempt", callback);
  }

  onReconnectFailed(callback: () => void): () => void {
    this.socket.io.on("reconnect_failed", callback);
    return () => this.socket.io.off("reconnect_failed", callback);
  }
}
