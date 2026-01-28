import { z } from "zod";
// Game definition schema
export const GameDefinitionSchema = z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    minPlayers: z.number().int().positive(),
    maxPlayers: z.number().int().positive(),
    roles: z.array(z.string()).optional(),
});
// Game-specific event envelope (used for routing game events)
export const GameEventSchema = z.object({
    type: z.string(),
    payload: z.unknown(),
});
