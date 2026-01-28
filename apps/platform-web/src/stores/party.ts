import { defineStore } from "pinia";
import { ref, computed } from "vue";
import {
  PlatformChannel,
  type Party,
  type PartyJoinedPayload,
  type PartyErrorPayload,
  type GameStartedPayload,
} from "@game-hub/platform-sdk";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? "http://localhost:3000";
const TOKEN_STORAGE_KEY = "game-hub:platform-token";
const PLAYER_ID_STORAGE_KEY = "game-hub:player-id";
const PARTY_ID_STORAGE_KEY = "game-hub:party-id";

// Game session context passed to GameHost
export interface GameSessionContext {
  gameId: string;
  sessionId: string;
  joinToken: string;
  wsNamespace: string;
  apiBaseUrl: string;
}

export const usePartyStore = defineStore("party", () => {
  // State
  const party = ref<Party | null>(null);
  const playerId = ref<string | null>(null);
  const token = ref<string | null>(null);
  const error = ref<PartyErrorPayload | null>(null);
  const connected = ref(false);
  const loading = ref(false);
  const activeGameSession = ref<GameSessionContext | null>(null);

  // Platform channel (singleton)
  let channel: PlatformChannel | null = null;

  // Computed
  const isHost = computed(() => {
    return party.value?.hostId === playerId.value;
  });

  const isOwner = computed(() => {
    return party.value?.ownerId === playerId.value;
  });

  const currentPlayer = computed(() => {
    return party.value?.players.find((p) => p.id === playerId.value) ?? null;
  });

  const isInGame = computed(() => {
    return party.value?.status === "in_game";
  });

  // Persistence helpers
  function saveToStorage(): void {
    if (token.value) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token.value);
    }
    if (playerId.value) {
      localStorage.setItem(PLAYER_ID_STORAGE_KEY, playerId.value);
    }
    if (party.value?.id) {
      localStorage.setItem(PARTY_ID_STORAGE_KEY, party.value.id);
    }
  }

  function loadFromStorage(): { token?: string; playerId?: string; partyId?: string } {
    return {
      token: localStorage.getItem(TOKEN_STORAGE_KEY) ?? undefined,
      playerId: localStorage.getItem(PLAYER_ID_STORAGE_KEY) ?? undefined,
      partyId: localStorage.getItem(PARTY_ID_STORAGE_KEY) ?? undefined,
    };
  }

  function clearStorage(): void {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(PLAYER_ID_STORAGE_KEY);
    localStorage.removeItem(PARTY_ID_STORAGE_KEY);
  }

  // Actions
  function getChannel(): PlatformChannel {
    if (!channel) {
      // Try to load token from storage for reconnection
      const stored = loadFromStorage();
      
      channel = new PlatformChannel({
        url: SOCKET_URL,
        token: stored.token,
      });

      // Restore playerId from storage if available
      if (stored.playerId) {
        playerId.value = stored.playerId;
      }

      channel.onConnect(() => {
        connected.value = true;
        loading.value = false;
      });

      channel.onDisconnect(() => {
        connected.value = false;
      });

      channel.onJoined((payload: PartyJoinedPayload) => {
        playerId.value = payload.playerId;
        token.value = payload.token;
        loading.value = false;
        saveToStorage();
      });

      channel.onState((state: Party) => {
        party.value = state;
        error.value = null;
        saveToStorage();
      });

      channel.onError((err: PartyErrorPayload) => {
        error.value = err;
        loading.value = false;
      });

      channel.onGameStarted((payload: GameStartedPayload) => {
        activeGameSession.value = {
          gameId: payload.gameId,
          sessionId: payload.sessionId,
          joinToken: payload.joinToken,
          wsNamespace: payload.wsNamespace,
          apiBaseUrl: SOCKET_URL,
        };
        loading.value = false;
      });
    }
    return channel;
  }

  function connect(): void {
    const ch = getChannel();
    if (!ch.connected) {
      ch.connect();
    }
  }

  function disconnect(): void {
    if (channel) {
      channel.disconnect();
      party.value = null;
      playerId.value = null;
      token.value = null;
      error.value = null;
      connected.value = false;
      activeGameSession.value = null;
      clearStorage();
    }
  }

  function createParty(name: string, gameId?: string): void {
    connect();
    loading.value = true;
    error.value = null;
    getChannel().createParty({ name, gameId });
  }

  function joinParty(partyId: string, name: string): void {
    connect();
    loading.value = true;
    error.value = null;
    getChannel().joinParty({ partyId, name });
  }

  function leaveParty(): void {
    getChannel().leaveParty();
    party.value = null;
    playerId.value = null;
    token.value = null;
    activeGameSession.value = null;
    clearStorage();
  }

  function setRole(targetPlayerId: string, role: string | null): void {
    getChannel().setRole({ playerId: targetPlayerId, role });
  }

  function selectGame(gameId: string): void {
    getChannel().selectGame({ gameId });
  }

  function startGame(): void {
    loading.value = true;
    getChannel().startGame();
  }

  function clearError(): void {
    error.value = null;
  }

  return {
    // State
    party,
    playerId,
    token,
    error,
    connected,
    loading,
    activeGameSession,

    // Computed
    isHost,
    isOwner,
    currentPlayer,
    isInGame,

    // Actions
    connect,
    disconnect,
    createParty,
    joinParty,
    leaveParty,
    setRole,
    selectGame,
    startGame,
    clearError,
  };
});
