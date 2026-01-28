import { z } from "zod";
export declare const GameDefinitionSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    minPlayers: z.ZodNumber;
    maxPlayers: z.ZodNumber;
    roles: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$strip>;
export type GameDefinition = z.infer<typeof GameDefinitionSchema>;
export declare const GameEventSchema: z.ZodObject<{
    type: z.ZodString;
    payload: z.ZodUnknown;
}, z.core.$strip>;
export type GameEvent = z.infer<typeof GameEventSchema>;
export interface GameClientToServerEvents {
    "game:action": (event: GameEvent) => void;
}
export interface GameServerToClientEvents {
    "game:state": (state: unknown) => void;
    "game:event": (event: GameEvent) => void;
}
