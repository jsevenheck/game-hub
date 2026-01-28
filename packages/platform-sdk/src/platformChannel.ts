import { io, Socket } from "socket.io-client";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  CreatePartyPayload,
  JoinPartyPayload,
  SetRolePayload,
  PartyStatePayload,
  PartyJoinedPayload,
  PartyErrorPayload,
} from "@game-hub/contracts";

export type PlatformSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export interface PlatformChannelOptions {
  url: string;
  autoConnect?: boolean;
}

export type StateCallback = (state: PartyStatePayload) => void;
export type JoinedCallback = (payload: PartyJoinedPayload) => void;
export type ErrorCallback = (error: PartyErrorPayload) => void;

export class PlatformChannel {
  private socket: PlatformSocket;
  private stateListeners: Set<StateCallback> = new Set();
  private joinedListeners: Set<JoinedCallback> = new Set();
  private errorListeners: Set<ErrorCallback> = new Set();

  constructor(options: PlatformChannelOptions) {
    this.socket = io(options.url, {
      autoConnect: options.autoConnect ?? false,
      transports: ["websocket", "polling"],
    }) as PlatformSocket;

    this.setupListeners();
  }

  private setupListeners(): void {
    this.socket.on("party:state", (state) => {
      this.stateListeners.forEach((cb) => cb(state));
    });

    this.socket.on("party:joined", (payload) => {
      this.joinedListeners.forEach((cb) => cb(payload));
    });

    this.socket.on("party:error", (error) => {
      this.errorListeners.forEach((cb) => cb(error));
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

  onConnect(callback: () => void): () => void {
    this.socket.on("connect", callback);
    return () => this.socket.off("connect", callback);
  }

  onDisconnect(callback: (reason: string) => void): () => void {
    this.socket.on("disconnect", callback);
    return () => this.socket.off("disconnect", callback);
  }
}
