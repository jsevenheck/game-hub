import { z } from "zod";
export declare const PartyStatus: {
    readonly Lobby: "lobby";
    readonly InGame: "in_game";
};
export type PartyStatus = (typeof PartyStatus)[keyof typeof PartyStatus];
export declare const PlayerSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    role: z.ZodOptional<z.ZodString>;
    connected: z.ZodBoolean;
}, z.core.$strip>;
export type Player = z.infer<typeof PlayerSchema>;
export declare const PartySchema: z.ZodObject<{
    id: z.ZodString;
    status: z.ZodEnum<{
        lobby: "lobby";
        in_game: "in_game";
    }>;
    hostId: z.ZodString;
    gameId: z.ZodString;
    players: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        role: z.ZodOptional<z.ZodString>;
        connected: z.ZodBoolean;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type Party = z.infer<typeof PartySchema>;
export declare const CreatePartyPayloadSchema: z.ZodObject<{
    gameId: z.ZodString;
    name: z.ZodString;
}, z.core.$strip>;
export type CreatePartyPayload = z.infer<typeof CreatePartyPayloadSchema>;
export declare const JoinPartyPayloadSchema: z.ZodObject<{
    partyId: z.ZodString;
    name: z.ZodString;
}, z.core.$strip>;
export type JoinPartyPayload = z.infer<typeof JoinPartyPayloadSchema>;
export declare const SetRolePayloadSchema: z.ZodObject<{
    playerId: z.ZodString;
    role: z.ZodString;
}, z.core.$strip>;
export type SetRolePayload = z.infer<typeof SetRolePayloadSchema>;
export declare const PartyStatePayloadSchema: z.ZodObject<{
    id: z.ZodString;
    status: z.ZodEnum<{
        lobby: "lobby";
        in_game: "in_game";
    }>;
    hostId: z.ZodString;
    gameId: z.ZodString;
    players: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        role: z.ZodOptional<z.ZodString>;
        connected: z.ZodBoolean;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type PartyStatePayload = Party;
export declare const PartyErrorPayloadSchema: z.ZodObject<{
    code: z.ZodString;
    message: z.ZodString;
}, z.core.$strip>;
export type PartyErrorPayload = z.infer<typeof PartyErrorPayloadSchema>;
export declare const PartyJoinedPayloadSchema: z.ZodObject<{
    partyId: z.ZodString;
    playerId: z.ZodString;
    token: z.ZodString;
}, z.core.$strip>;
export type PartyJoinedPayload = z.infer<typeof PartyJoinedPayloadSchema>;
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
