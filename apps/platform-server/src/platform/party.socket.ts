import type { Server, Socket } from "socket.io";
import {
  CreatePartyPayloadSchema,
  JoinPartyPayloadSchema,
  SetRolePayloadSchema,
  type ClientToServerEvents,
  type ServerToClientEvents,
  type CreatePartyPayload,
  type JoinPartyPayload,
  type SetRolePayload,
} from "@game-hub/contracts";
import * as partyService from "./party.service.js";
import * as tokenService from "./token.service.js";

type PlatformSocket = Socket<ClientToServerEvents, ServerToClientEvents>;
type PlatformServer = Server<ClientToServerEvents, ServerToClientEvents>;

// Track socket -> party/player mapping
const socketToParty = new Map<string, { partyId: string; playerId: string }>();

function getSocketRoom(partyId: string): string {
  return `party:${partyId}`;
}

function broadcastState(io: PlatformServer, partyId: string): void {
  const party = partyService.getParty(partyId);
  if (party) {
    io.to(getSocketRoom(partyId)).emit("party:state", party);
  }
}

export function registerPartyHandlers(io: PlatformServer): void {
  io.on("connection", (socket: PlatformSocket) => {
    console.log(`[platform] Client connected: ${socket.id}`);

    socket.on("party:create", (payload: CreatePartyPayload) => {
      try {
        const parsed = CreatePartyPayloadSchema.parse(payload);
        const playerId = socket.id;
        const party = partyService.createParty(playerId, parsed.name, parsed.gameId);
        const token = tokenService.generateToken(party.id, playerId, true);

        // Track this socket
        socketToParty.set(socket.id, { partyId: party.id, playerId });

        // Join socket room
        socket.join(getSocketRoom(party.id));

        // Send joined event with token
        socket.emit("party:joined", {
          partyId: party.id,
          playerId,
          token,
        });

        // Broadcast state to room
        broadcastState(io, party.id);
      } catch (error) {
        socket.emit("party:error", {
          code: "CREATE_FAILED",
          message: error instanceof Error ? error.message : "Failed to create party",
        });
      }
    });

    socket.on("party:join", (payload: JoinPartyPayload) => {
      try {
        const parsed = JoinPartyPayloadSchema.parse(payload);
        const playerId = socket.id;
        const party = partyService.joinParty(parsed.partyId, playerId, parsed.name);

        if (!party) {
          socket.emit("party:error", {
            code: "JOIN_FAILED",
            message: "Party not found or not in lobby state",
          });
          return;
        }

        const token = tokenService.generateToken(party.id, playerId, false);

        // Track this socket
        socketToParty.set(socket.id, { partyId: party.id, playerId });

        // Join socket room
        socket.join(getSocketRoom(party.id));

        // Send joined event with token
        socket.emit("party:joined", {
          partyId: party.id,
          playerId,
          token,
        });

        // Broadcast state to all in room
        broadcastState(io, party.id);
      } catch (error) {
        socket.emit("party:error", {
          code: "JOIN_FAILED",
          message: error instanceof Error ? error.message : "Failed to join party",
        });
      }
    });

    socket.on("party:leave", () => {
      const mapping = socketToParty.get(socket.id);
      if (!mapping) return;

      const { partyId, playerId } = mapping;
      const party = partyService.leaveParty(partyId, playerId);

      socket.leave(getSocketRoom(partyId));
      socketToParty.delete(socket.id);

      if (party) {
        broadcastState(io, partyId);
      }
    });

    socket.on("party:setRole", (payload: SetRolePayload) => {
      try {
        const parsed = SetRolePayloadSchema.parse(payload);
        const mapping = socketToParty.get(socket.id);

        if (!mapping) {
          socket.emit("party:error", {
            code: "NOT_IN_PARTY",
            message: "You are not in a party",
          });
          return;
        }

        const { partyId, playerId } = mapping;
        const party = partyService.setPlayerRole(partyId, parsed.playerId, parsed.role, playerId);

        if (!party) {
          socket.emit("party:error", {
            code: "SET_ROLE_FAILED",
            message: "Failed to set role. Only the host can assign roles.",
          });
          return;
        }

        broadcastState(io, partyId);
      } catch (error) {
        socket.emit("party:error", {
          code: "SET_ROLE_FAILED",
          message: error instanceof Error ? error.message : "Failed to set role",
        });
      }
    });

    socket.on("party:start", () => {
      const mapping = socketToParty.get(socket.id);
      if (!mapping) {
        socket.emit("party:error", {
          code: "NOT_IN_PARTY",
          message: "You are not in a party",
        });
        return;
      }

      const { partyId, playerId } = mapping;
      const party = partyService.startGame(partyId, playerId);

      if (!party) {
        socket.emit("party:error", {
          code: "START_FAILED",
          message: "Failed to start game. Only the host can start the game.",
        });
        return;
      }

      broadcastState(io, partyId);
    });

    socket.on("disconnect", () => {
      console.log(`[platform] Client disconnected: ${socket.id}`);
      const mapping = socketToParty.get(socket.id);
      if (!mapping) return;

      const { partyId, playerId } = mapping;
      const party = partyService.leaveParty(partyId, playerId);

      socketToParty.delete(socket.id);

      if (party) {
        broadcastState(io, partyId);
      }
    });
  });
}
