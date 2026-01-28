import { z } from "zod";

// Party status enum
export const PartyStatus = {
  Lobby: "lobby",
  InGame: "in_game",
} as const;
export type PartyStatus = (typeof PartyStatus)[keyof typeof PartyStatus];

// Player schema
export const PlayerSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(50),
  role: z.string().optional(),
  connected: z.boolean(),
});
export type Player = z.infer<typeof PlayerSchema>;

// Party schema
export const PartySchema = z.object({
  id: z.string(),
  status: z.enum(["lobby", "in_game"]),
  hostId: z.string(),
  gameId: z.string(),
  players: z.array(PlayerSchema),
});
export type Party = z.infer<typeof PartySchema>;

// Client -> Server events
export const CreatePartyPayloadSchema = z.object({
  gameId: z.string().min(1),
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
  role: z.string().min(1),
});
export type SetRolePayload = z.infer<typeof SetRolePayloadSchema>;

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

// Event type maps for type-safe socket communication
export interface ClientToServerEvents {
  "party:create": (payload: CreatePartyPayload) => void;
  "party:join": (payload: JoinPartyPayload) => void;
  "party:leave": () => void;
  "party:setRole": (payload: SetRolePayload) => void;
  "party:start": () => void;
}

export interface ServerToClientEvents {
  "party:joined": (payload: PartyJoinedPayload) => void;
  "party:state": (payload: PartyStatePayload) => void;
  "party:error": (payload: PartyErrorPayload) => void;
}
