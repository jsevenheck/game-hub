import crypto from "node:crypto";

/**
 * Token service for generating and validating platform and game tokens.
 * In a production environment, this would use JWTs or similar.
 */

export interface PlatformTokenData {
  type: "platform";
  partyId: string;
  playerId: string;
  isHost: boolean;
  createdAt: number;
}

export interface JoinTokenData {
  type: "join";
  partyId: string;
  playerId: string;
  sessionId: string;
  createdAt: number;
}

export type TokenData = PlatformTokenData | JoinTokenData;

const tokens = new Map<string, TokenData>();

// Token expiration: 24 hours for platform tokens, 1 hour for join tokens
const PLATFORM_TOKEN_TTL = 24 * 60 * 60 * 1000;
const JOIN_TOKEN_TTL = 60 * 60 * 1000;

export function generatePlayerId(): string {
  return crypto.randomUUID();
}

export function generateSessionId(): string {
  return crypto.randomUUID();
}

export function generateToken(partyId: string, playerId: string, isHost: boolean): string {
  const token = crypto.randomUUID();
  tokens.set(token, {
    type: "platform",
    partyId,
    playerId,
    isHost,
    createdAt: Date.now(),
  });
  return token;
}

export function generateJoinToken(partyId: string, playerId: string, sessionId: string): string {
  const token = crypto.randomUUID();
  tokens.set(token, {
    type: "join",
    partyId,
    playerId,
    sessionId,
    createdAt: Date.now(),
  });
  return token;
}

export function validateToken(token: string): TokenData | null {
  const data = tokens.get(token);
  if (!data) return null;

  // Check expiration
  const ttl = data.type === "platform" ? PLATFORM_TOKEN_TTL : JOIN_TOKEN_TTL;
  if (Date.now() - data.createdAt > ttl) {
    tokens.delete(token);
    return null;
  }

  return data;
}

export function validatePlatformToken(token: string): PlatformTokenData | null {
  const data = validateToken(token);
  if (data?.type === "platform") return data;
  return null;
}

export function validateJoinToken(token: string): JoinTokenData | null {
  const data = validateToken(token);
  if (data?.type === "join") return data;
  return null;
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
