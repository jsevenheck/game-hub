import { z } from "zod";

// Party status enum
export const PartyStatus = {
  Lobby: "lobby",
  InGame: "in_game",
} as const;
export type PartyStatus = (typeof PartyStatus)[keyof typeof PartyStatus];

// Player schema
export const PlayerSchema = z.object({
  id: z.string(), // Stable playerId (UUID), NOT socket.id
  name: z.string().min(1).max(50),
  role: z.string().nullable().optional(),
  connected: z.boolean(),
});
export type Player = z.infer<typeof PlayerSchema>;

// Party schema
export const PartySchema = z.object({
  id: z.string(),
  status: z.enum(["lobby", "in_game"]),
  hostId: z.string(), // Stable playerId, NOT socket.id
  gameId: z.string().nullable(), // Optional in lobby, required to start
  players: z.array(PlayerSchema),
});
export type Party = z.infer<typeof PartySchema>;

// Client -> Server events
export const CreatePartyPayloadSchema = z.object({
  gameId: z.string().min(1).optional(), // Optional at creation
  name: z.string().min(1).max(50),
});
export type CreatePartyPayload = z.infer<typeof CreatePartyPayloadSchema>;

export const JoinPartyPayloadSchema = z.object({
  partyId: z.string().min(1),
  name: z.string().min(1).max(50),
});
export type JoinPartyPayload = z.infer<typeof JoinPartyPayloadSchema>;

export const SetRolePayloadSchema = z.object({
  playerId: z.string().min(1),
  role: z.string().min(1).nullable(), // Allow null to clear role
});
export type SetRolePayload = z.infer<typeof SetRolePayloadSchema>;

export const SelectGamePayloadSchema = z.object({
  gameId: z.string().min(1),
});
export type SelectGamePayload = z.infer<typeof SelectGamePayloadSchema>;

// Server -> Client events
export const PartyStatePayloadSchema = PartySchema;
export type PartyStatePayload = Party;

export const PartyErrorPayloadSchema = z.object({
  code: z.string(),
  message: z.string(),
});
export type PartyErrorPayload = z.infer<typeof PartyErrorPayloadSchema>;

// Create/Join response (contains token for reconnection)
export const PartyJoinedPayloadSchema = z.object({
  partyId: z.string(),
  playerId: z.string(),
  token: z.string(),
});
export type PartyJoinedPayload = z.infer<typeof PartyJoinedPayloadSchema>;

// Game started payload (sent to each player individually with their joinToken)
export const GameStartedPayloadSchema = z.object({
  gameId: z.string(),
  sessionId: z.string(),
  wsNamespace: z.string(), // e.g., "/g/werwolf"
  joinToken: z.string(), // Per-player token to join game namespace
});
export type GameStartedPayload = z.infer<typeof GameStartedPayloadSchema>;

// Event type maps for type-safe socket communication
export interface ClientToServerEvents {
  "party:create": (payload: CreatePartyPayload) => void;
  "party:join": (payload: JoinPartyPayload) => void;
  "party:leave": () => void;
  "party:setRole": (payload: SetRolePayload) => void;
  "party:selectGame": (payload: SelectGamePayload) => void;
  "party:start": () => void;
}

export interface ServerToClientEvents {
  "party:joined": (payload: PartyJoinedPayload) => void;
  "party:state": (payload: PartyStatePayload) => void;
  "party:error": (payload: PartyErrorPayload) => void;
  "party:gameStarted": (payload: GameStartedPayload) => void;
}
