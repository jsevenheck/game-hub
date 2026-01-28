import { z } from "zod";

// Game definition schema
export const GameDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  minPlayers: z.number().int().positive(),
  maxPlayers: z.number().int().positive(),
  roles: z.array(z.string()).optional(),
});
export type GameDefinition = z.infer<typeof GameDefinitionSchema>;

// Game-specific event envelope (used for routing game events)
export const GameEventSchema = z.object({
  type: z.string(),
  payload: z.unknown(),
});
export type GameEvent = z.infer<typeof GameEventSchema>;

// Game namespace events
export interface GameClientToServerEvents {
  "game:action": (event: GameEvent) => void;
}

export interface GameServerToClientEvents {
  "game:state": (state: unknown) => void;
  "game:event": (event: GameEvent) => void;
}
