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
  private _token: string | undefined;

  constructor(options: PlatformChannelOptions) {
    this._token = options.token;
    
    // Connect to /platform namespace with auth token if available
    const baseUrl = options.url.replace(/\/$/, "");
    this.socket = io(`${baseUrl}/platform`, {
      autoConnect: options.autoConnect ?? false,
      transports: ["websocket", "polling"],
      auth: this._token ? { token: this._token } : undefined,
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
    // Ensure socket.auth exists and set the token for next connection
    if (!this.socket.auth || typeof this.socket.auth !== "object") {
      this.socket.auth = { token };
    } else {
      (this.socket.auth as Record<string, string>)["token"] = token;
    }
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
}
