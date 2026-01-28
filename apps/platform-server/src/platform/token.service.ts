import crypto from "node:crypto";

/**
 * Simple token service for generating and validating tokens.
 * In a production environment, this would use JWTs or similar.
 */

interface TokenData {
  partyId: string;
  playerId: string;
  isHost: boolean;
}

const tokens = new Map<string, TokenData>();

export function generateToken(partyId: string, playerId: string, isHost: boolean): string {
  const token = crypto.randomUUID();
  tokens.set(token, { partyId, playerId, isHost });
  return token;
}

export function validateToken(token: string): TokenData | null {
  return tokens.get(token) ?? null;
}

export function revokeToken(token: string): boolean {
  return tokens.delete(token);
}

export function revokeAllPartyTokens(partyId: string): void {
  for (const [token, data] of tokens.entries()) {
    if (data.partyId === partyId) {
      tokens.delete(token);
    }
  }
}
