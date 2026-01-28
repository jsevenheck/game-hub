import type { Namespace, Server, Socket } from "socket.io";
import {
  CreatePartyPayloadSchema,
  JoinPartyPayloadSchema,
  SetRolePayloadSchema,
  SelectGamePayloadSchema,
  type ClientToServerEvents,
  type ServerToClientEvents,
  type CreatePartyPayload,
  type JoinPartyPayload,
  type SetRolePayload,
  type SelectGamePayload,
} from "@game-hub/contracts";
import * as partyService from "./party.service.js";
import * as tokenService from "./token.service.js";
import { isGameRegistered } from "../games/registry.js";

// Socket data type for our platform sockets
interface PlatformSocketData {
  playerId?: string;
  partyId?: string;
  isHost?: boolean;
  authenticated?: boolean;
}

type PlatformSocket = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, PlatformSocketData>;
type PlatformNamespace = Namespace<ClientToServerEvents, ServerToClientEvents, Record<string, never>, PlatformSocketData>;

function getSocketRoom(partyId: string): string {
  return `party:${partyId}`;
}

function broadcastState(nsp: PlatformNamespace, partyId: string): void {
  const party = partyService.getParty(partyId);
  if (party) {
    nsp.to(getSocketRoom(partyId)).emit("party:state", party);
  }
}

export function registerPartyHandlers(io: Server): PlatformNamespace {
  // Create /platform namespace
  const platformNsp = io.of("/platform") as PlatformNamespace;

  // Auth middleware - validate token if provided
  platformNsp.use((socket: PlatformSocket, next) => {
    const token = socket.handshake.auth?.["token"] as string | undefined;
    
    if (token) {
      const tokenData = tokenService.validatePlatformToken(token);
      if (tokenData) {
        // Valid token - set socket data for reconnection
        socket.data.playerId = tokenData.playerId;
        socket.data.partyId = tokenData.partyId;
        socket.data.isHost = tokenData.isHost;
        socket.data.authenticated = true;
      }
    }
    
    // Allow connection even without token (for initial party:create/join)
    next();
  });

  platformNsp.on("connection", (socket: PlatformSocket) => {
    console.log(`[platform] Client connected: ${socket.id}`);

    // Handle reconnection with existing token
    if (socket.data.authenticated && socket.data.partyId && socket.data.playerId) {
      const party = partyService.reconnectPlayer(socket.data.partyId, socket.data.playerId);
      if (party) {
        // Rejoin the room
        socket.join(getSocketRoom(socket.data.partyId));
        partyService.setSocketMapping(socket.id, socket.data.partyId, socket.data.playerId);
        
        // Send current state
        socket.emit("party:state", party);
        
        // Broadcast updated state to others
        broadcastState(platformNsp, socket.data.partyId);
        
        console.log(`[platform] Player ${socket.data.playerId} reconnected to party ${socket.data.partyId}`);
      }
    }

    socket.on("party:create", (payload: CreatePartyPayload) => {
      try {
        const parsed = CreatePartyPayloadSchema.parse(payload);
        const { party, playerId } = partyService.createParty(parsed.name, parsed.gameId);
        const token = tokenService.generateToken(party.id, playerId, true);

        // Set socket data
        socket.data.playerId = playerId;
        socket.data.partyId = party.id;
        socket.data.isHost = true;
        socket.data.authenticated = true;

        // Track this socket
        partyService.setSocketMapping(socket.id, party.id, playerId);

        // Join socket room
        socket.join(getSocketRoom(party.id));

        // Send joined event with token
        socket.emit("party:joined", {
          partyId: party.id,
          playerId,
          token,
        });

        // Broadcast state to room
        broadcastState(platformNsp, party.id);
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
        const result = partyService.joinParty(parsed.partyId, parsed.name);

        if (!result) {
          socket.emit("party:error", {
            code: "JOIN_FAILED",
            message: "Party not found or not in lobby state",
          });
          return;
        }

        const { party, playerId } = result;
        const token = tokenService.generateToken(party.id, playerId, false);

        // Set socket data
        socket.data.playerId = playerId;
        socket.data.partyId = party.id;
        socket.data.isHost = false;
        socket.data.authenticated = true;

        // Track this socket
        partyService.setSocketMapping(socket.id, party.id, playerId);

        // Join socket room
        socket.join(getSocketRoom(party.id));

        // Send joined event with token
        socket.emit("party:joined", {
          partyId: party.id,
          playerId,
          token,
        });

        // Broadcast state to all in room
        broadcastState(platformNsp, party.id);
      } catch (error) {
        socket.emit("party:error", {
          code: "JOIN_FAILED",
          message: error instanceof Error ? error.message : "Failed to join party",
        });
      }
    });

    socket.on("party:leave", () => {
      const mapping = partyService.getSocketMapping(socket.id);
      if (!mapping) return;

      const { partyId, playerId } = mapping;
      const party = partyService.disconnectPlayer(partyId, playerId);

      socket.leave(getSocketRoom(partyId));
      partyService.removeSocketMapping(socket.id);

      // Clear socket data
      socket.data.playerId = undefined;
      socket.data.partyId = undefined;
      socket.data.isHost = undefined;
      socket.data.authenticated = false;

      if (party) {
        broadcastState(platformNsp, partyId);
      }
    });

    socket.on("party:setRole", (payload: SetRolePayload) => {
      try {
        const parsed = SetRolePayloadSchema.parse(payload);
        const mapping = partyService.getSocketMapping(socket.id);

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

        broadcastState(platformNsp, partyId);
      } catch (error) {
        socket.emit("party:error", {
          code: "SET_ROLE_FAILED",
          message: error instanceof Error ? error.message : "Failed to set role",
        });
      }
    });

    socket.on("party:selectGame", (payload: SelectGamePayload) => {
      try {
        const parsed = SelectGamePayloadSchema.parse(payload);
        const mapping = partyService.getSocketMapping(socket.id);

        if (!mapping) {
          socket.emit("party:error", {
            code: "NOT_IN_PARTY",
            message: "You are not in a party",
          });
          return;
        }

        const { partyId, playerId } = mapping;
        const party = partyService.selectGame(partyId, parsed.gameId, playerId);

        if (!party) {
          socket.emit("party:error", {
            code: "SELECT_GAME_FAILED",
            message: "Failed to select game. Only the host can select a game.",
          });
          return;
        }

        broadcastState(platformNsp, partyId);
      } catch (error) {
        socket.emit("party:error", {
          code: "SELECT_GAME_FAILED",
          message: error instanceof Error ? error.message : "Failed to select game",
        });
      }
    });

    socket.on("party:start", () => {
      const mapping = partyService.getSocketMapping(socket.id);
      if (!mapping) {
        socket.emit("party:error", {
          code: "NOT_IN_PARTY",
          message: "You are not in a party",
        });
        return;
      }

      const { partyId, playerId } = mapping;
      const party = partyService.getParty(partyId);

      if (!party) {
        socket.emit("party:error", {
          code: "START_FAILED",
          message: "Party not found.",
        });
        return;
      }

      // Check if a game is selected
      if (!party.gameId) {
        socket.emit("party:error", {
          code: "START_FAILED",
          message: "Please select a game before starting.",
        });
        return;
      }

      // Note: We allow starting even if game is not registered.
      // This enables testing the "game started" flow with placeholder UI.
      // The client will show a placeholder when no game UI is registered.
      if (!isGameRegistered(party.gameId)) {
        console.log(`[platform] Starting unregistered game "${party.gameId}" - placeholder mode`);
      }

      const result = partyService.startGame(partyId, playerId);

      if (!result) {
        socket.emit("party:error", {
          code: "START_FAILED",
          message: "Failed to start game. Only the host can start the game.",
        });
        return;
      }

      const { sessionId } = result;
      const wsNamespace = `/g/${party.gameId}`;

      // Emit party:gameStarted to each player with their own joinToken
      const socketsInRoom = platformNsp.adapter.rooms.get(getSocketRoom(partyId));
      if (socketsInRoom) {
        for (const socketId of socketsInRoom) {
          const playerMapping = partyService.getSocketMapping(socketId);
          if (playerMapping) {
            const joinToken = tokenService.generateJoinToken(partyId, playerMapping.playerId, sessionId);
            const playerSocket = platformNsp.sockets.get(socketId);
            if (playerSocket) {
              playerSocket.emit("party:gameStarted", {
                gameId: party.gameId,
                sessionId,
                wsNamespace,
                joinToken,
              });
            }
          }
        }
      }

      // Broadcast updated party state
      broadcastState(platformNsp, partyId);
    });

    socket.on("disconnect", () => {
      console.log(`[platform] Client disconnected: ${socket.id}`);
      const mapping = partyService.getSocketMapping(socket.id);
      if (!mapping) return;

      const { partyId, playerId } = mapping;
      const party = partyService.disconnectPlayer(partyId, playerId);

      partyService.removeSocketMapping(socket.id);

      if (party) {
        broadcastState(platformNsp, partyId);
      }
    });
  });

  return platformNsp;
}
