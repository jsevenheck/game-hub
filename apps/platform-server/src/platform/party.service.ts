import crypto from "node:crypto";
import type { Party, Player } from "@game-hub/contracts";
import { revokeAllPartyTokens } from "./token.service.js";

const parties = new Map<string, Party>();

function generateId(): string {
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

export function createParty(hostId: string, hostName: string, gameId: string): Party {
  const partyId = generateId();
  const hostPlayer: Player = {
    id: hostId,
    name: hostName,
    connected: true,
  };

  const party: Party = {
    id: partyId,
    status: "lobby",
    hostId,
    gameId,
    players: [hostPlayer],
  };

  parties.set(partyId, party);
  return party;
}

export function getParty(partyId: string): Party | undefined {
  return parties.get(partyId);
}

export function joinParty(partyId: string, playerId: string, playerName: string): Party | null {
  const party = parties.get(partyId);
  if (!party) return null;
  if (party.status !== "lobby") return null;

  // Check if player already exists (reconnection)
  const existingPlayer = party.players.find((p) => p.id === playerId);
  if (existingPlayer) {
    existingPlayer.connected = true;
    return party;
  }

  const player: Player = {
    id: playerId,
    name: playerName,
    connected: true,
  };

  party.players.push(player);
  return party;
}

export function leaveParty(partyId: string, playerId: string): Party | null {
  const party = parties.get(partyId);
  if (!party) return null;

  const playerIndex = party.players.findIndex((p) => p.id === playerId);
  if (playerIndex === -1) return null;

  // Mark as disconnected instead of removing
  const player = party.players[playerIndex];
  if (player) {
    player.connected = false;
  }

  // If host disconnected and all players are disconnected, clean up the party
  const allDisconnected = party.players.every((p) => !p.connected);
  if (allDisconnected) {
    parties.delete(partyId);
    revokeAllPartyTokens(partyId);
    return null;
  }

  return party;
}

export function setPlayerRole(
  partyId: string,
  playerId: string,
  role: string,
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

export function startGame(partyId: string, requesterId: string): Party | null {
  const party = parties.get(partyId);
  if (!party) return null;
  if (party.hostId !== requesterId) return null; // Only host can start
  if (party.status !== "lobby") return null;

  party.status = "in_game";
  return party;
}

export function deleteParty(partyId: string): boolean {
  revokeAllPartyTokens(partyId);
  return parties.delete(partyId);
}
