import { z } from "zod";
// Party status enum
export const PartyStatus = {
    Lobby: "lobby",
    InGame: "in_game",
};
// Player schema
export const PlayerSchema = z.object({
    id: z.string(),
    name: z.string().min(1).max(50),
    role: z.string().optional(),
    connected: z.boolean(),
});
// Party schema
export const PartySchema = z.object({
    id: z.string(),
    status: z.enum(["lobby", "in_game"]),
    hostId: z.string(),
    gameId: z.string(),
    players: z.array(PlayerSchema),
});
// Client -> Server events
export const CreatePartyPayloadSchema = z.object({
    gameId: z.string().min(1),
    name: z.string().min(1).max(50),
});
export const JoinPartyPayloadSchema = z.object({
    partyId: z.string().min(1),
    name: z.string().min(1).max(50),
});
export const SetRolePayloadSchema = z.object({
    playerId: z.string().min(1),
    role: z.string().min(1),
});
// Server -> Client events
export const PartyStatePayloadSchema = PartySchema;
export const PartyErrorPayloadSchema = z.object({
    code: z.string(),
    message: z.string(),
});
// Create/Join response (contains token for reconnection)
export const PartyJoinedPayloadSchema = z.object({
    partyId: z.string(),
    playerId: z.string(),
    token: z.string(),
});
