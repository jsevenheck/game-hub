import crypto from "node:crypto";
import type { Party, Player } from "@game-hub/contracts";
import { revokeAllPartyTokens, generatePlayerId, generateSessionId } from "./token.service.js";

const parties = new Map<string, Party>();

// Track socket to player mapping for reconnection
const socketToPlayer = new Map<string, { partyId: string; playerId: string }>();

function generatePartyId(): string {
  // Generate a short, user-friendly party code with collision detection
  let id: string;
  let attempts = 0;
  const maxAttempts = 10;

  do {
    id = crypto.randomBytes(3).toString("hex").toUpperCase();
    attempts++;
  } while (parties.has(id) && attempts < maxAttempts);

  if (parties.has(id)) {
    // Extremely unlikely, but use a longer ID as fallback
    id = crypto.randomBytes(6).toString("hex").toUpperCase();
  }

  return id;
}

export interface CreatePartyResult {
  party: Party;
  playerId: string;
}

export function createParty(hostName: string, gameId?: string): CreatePartyResult {
  const partyId = generatePartyId();
  const playerId = generatePlayerId();
  
  const hostPlayer: Player = {
    id: playerId,
    name: hostName,
    role: null,
    connected: true,
  };

  const party: Party = {
    id: partyId,
    status: "lobby",
    ownerId: playerId, // Original creator, permanent
    hostId: playerId, // Current host, can transfer on disconnect
    gameId: gameId ?? null,
    players: [hostPlayer],
  };

  parties.set(partyId, party);
  return { party, playerId };
}

export function getParty(partyId: string): Party | undefined {
  return parties.get(partyId);
}

export interface JoinPartyResult {
  party: Party;
  playerId: string;
}

export function joinParty(partyId: string, playerName: string): JoinPartyResult | null {
  const party = parties.get(partyId);
  if (!party) return null;
  if (party.status !== "lobby") return null;

  const playerId = generatePlayerId();
  
  const player: Player = {
    id: playerId,
    name: playerName,
    role: null,
    connected: true,
  };

  party.players.push(player);
  return { party, playerId };
}

export function reconnectPlayer(partyId: string, playerId: string): Party | null {
  const party = parties.get(partyId);
  if (!party) return null;

  const player = party.players.find((p) => p.id === playerId);
  if (!player) return null;

  player.connected = true;

  // If the reconnecting player is the owner, restore them as host
  if (party.ownerId === playerId && party.hostId !== playerId) {
    console.log(`[party] Owner ${playerId} (${player.name}) reconnected, restoring as host`);
    party.hostId = playerId;
  }

  return party;
}

export function disconnectPlayer(partyId: string, playerId: string): Party | null {
  const party = parties.get(partyId);
  if (!party) return null;

  const player = party.players.find((p) => p.id === playerId);
  if (!player) return null;

  player.connected = false;

  // If all players are disconnected, clean up the party
  const allDisconnected = party.players.every((p) => !p.connected);
  if (allDisconnected) {
    parties.delete(partyId);
    revokeAllPartyTokens(partyId);
    return null;
  }

  // If the disconnecting player was the host, transfer host to another connected player
  if (party.hostId === playerId) {
    const newHost = party.players.find((p) => p.connected && p.id !== playerId);
    if (newHost) {
      party.hostId = newHost.id;
      console.log(`[party] Host transferred from ${playerId} to ${newHost.id} (${newHost.name})`);
    }
  }

  return party;
}

export function setPlayerRole(
  partyId: string,
  playerId: string,
  role: string | null,
  requesterId: string
): Party | null {
  const party = parties.get(partyId);
  if (!party) return null;
  if (party.hostId !== requesterId) return null; // Only host can set roles

  const player = party.players.find((p) => p.id === playerId);
  if (!player) return null;

  player.role = role;
  return party;
}

export function selectGame(partyId: string, gameId: string, requesterId: string): Party | null {
  const party = parties.get(partyId);
  if (!party) return null;
  if (party.hostId !== requesterId) return null; // Only host can select game
  if (party.status !== "lobby") return null;

  party.gameId = gameId;
  return party;
}

export interface StartGameResult {
  party: Party;
  sessionId: string;
}

export function startGame(partyId: string, requesterId: string): StartGameResult | null {
  const party = parties.get(partyId);
  if (!party) return null;
  if (party.hostId !== requesterId) return null; // Only host can start
  if (party.status !== "lobby") return null;
  if (!party.gameId) return null; // Game must be selected

  const sessionId = generateSessionId();
  party.status = "in_game";
  
  return { party, sessionId };
}

export function deleteParty(partyId: string): boolean {
  revokeAllPartyTokens(partyId);
  return parties.delete(partyId);
}

// Socket mapping helpers
export function setSocketMapping(socketId: string, partyId: string, playerId: string): void {
  socketToPlayer.set(socketId, { partyId, playerId });
}

export function getSocketMapping(socketId: string): { partyId: string; playerId: string } | undefined {
  return socketToPlayer.get(socketId);
}

export function removeSocketMapping(socketId: string): void {
  socketToPlayer.delete(socketId);
}
