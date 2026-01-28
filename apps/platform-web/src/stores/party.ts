import { defineStore } from "pinia";
import { ref, computed } from "vue";
import {
  PlatformChannel,
  type Party,
  type PartyJoinedPayload,
  type PartyErrorPayload,
} from "@game-hub/platform-sdk";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? "http://localhost:3000";

export const usePartyStore = defineStore("party", () => {
  // State
  const party = ref<Party | null>(null);
  const playerId = ref<string | null>(null);
  const token = ref<string | null>(null);
  const error = ref<PartyErrorPayload | null>(null);
  const connected = ref(false);
  const loading = ref(false);

  // Platform channel (singleton)
  let channel: PlatformChannel | null = null;

  // Computed
  const isHost = computed(() => {
    return party.value?.hostId === playerId.value;
  });

  const currentPlayer = computed(() => {
    return party.value?.players.find((p) => p.id === playerId.value) ?? null;
  });

  const isInGame = computed(() => {
    return party.value?.status === "in_game";
  });

  // Actions
  function getChannel(): PlatformChannel {
    if (!channel) {
      channel = new PlatformChannel({ url: SOCKET_URL });

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
      });

      channel.onState((state: Party) => {
        party.value = state;
        error.value = null;
      });

      channel.onError((err: PartyErrorPayload) => {
        error.value = err;
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
    }
  }

  function createParty(gameId: string, name: string): void {
    connect();
    loading.value = true;
    error.value = null;
    getChannel().createParty({ gameId, name });
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
  }

  function setRole(targetPlayerId: string, role: string): void {
    getChannel().setRole({ playerId: targetPlayerId, role });
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

    // Computed
    isHost,
    currentPlayer,
    isInGame,

    // Actions
    connect,
    disconnect,
    createParty,
    joinParty,
    leaveParty,
    setRole,
    startGame,
    clearError,
  };
});
