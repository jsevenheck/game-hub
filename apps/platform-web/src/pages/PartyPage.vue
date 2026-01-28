<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { usePartyStore } from "../stores/party";
import GameHost from "../components/GameHost.vue";

const route = useRoute();
const router = useRouter();
const partyStore = usePartyStore();

// Form state
const playerName = ref("");
const partyIdInput = ref("");
const gameId = ref("demo"); // Default game for now

// Get party ID from route if present
const routePartyId = computed(() => route.params.id as string | undefined);

// View state
const showJoinForm = computed(() => !partyStore.party);
const showLobby = computed(() => partyStore.party?.status === "lobby");
const showGame = computed(() => partyStore.party?.status === "in_game");

// Initialize with route param
onMounted(() => {
  if (routePartyId.value) {
    partyIdInput.value = routePartyId.value;
  }
});

// Update URL when party changes
watch(
  () => partyStore.party?.id,
  (newId) => {
    if (newId && route.params.id !== newId) {
      router.replace(`/party/${newId}`);
    }
  }
);

// Cleanup on unmount
onUnmounted(() => {
  // Don't disconnect here - let the user stay connected
});

function handleCreate() {
  if (!playerName.value.trim()) return;
  partyStore.createParty(gameId.value, playerName.value.trim());
}

function handleJoin() {
  if (!playerName.value.trim() || !partyIdInput.value.trim()) return;
  partyStore.joinParty(partyIdInput.value.trim().toUpperCase(), playerName.value.trim());
}

function handleLeave() {
  partyStore.leaveParty();
  router.replace("/");
}

function handleStart() {
  partyStore.startGame();
}

function handleSetRole(playerId: string, role: string) {
  partyStore.setRole(playerId, role);
}

function copyPartyLink() {
  if (partyStore.party) {
    const url = `${window.location.origin}/party/${partyStore.party.id}`;
    navigator.clipboard.writeText(url);
  }
}
</script>

<template>
  <div class="party-page">
    <!-- Error Display -->
    <div v-if="partyStore.error" class="error-banner">
      <span>{{ partyStore.error.message }}</span>
      <button @click="partyStore.clearError">✕</button>
    </div>

    <!-- Join/Create Form -->
    <div v-if="showJoinForm" class="join-form">
      <h2>Welcome to Game Hub</h2>

      <div class="form-group">
        <label for="playerName">Your Name</label>
        <input
          id="playerName"
          v-model="playerName"
          type="text"
          placeholder="Enter your display name"
          maxlength="50"
        />
      </div>

      <div class="form-actions">
        <div class="action-group">
          <h3>Create a New Party</h3>
          <button
            @click="handleCreate"
            :disabled="!playerName.trim() || partyStore.loading"
            class="btn-primary"
          >
            {{ partyStore.loading ? "Creating..." : "Create Party" }}
          </button>
        </div>

        <div class="divider">or</div>

        <div class="action-group">
          <h3>Join Existing Party</h3>
          <div class="inline-form">
            <input
              v-model="partyIdInput"
              type="text"
              placeholder="Party Code"
              maxlength="10"
              class="party-code-input"
            />
            <button
              @click="handleJoin"
              :disabled="!playerName.trim() || !partyIdInput.trim() || partyStore.loading"
              class="btn-secondary"
            >
              {{ partyStore.loading ? "Joining..." : "Join" }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Lobby View -->
    <div v-if="showLobby && partyStore.party" class="lobby">
      <div class="lobby-header">
        <h2>Party Lobby</h2>
        <div class="party-code">
          <span>Code: <strong>{{ partyStore.party.id }}</strong></span>
          <button @click="copyPartyLink" class="btn-small">Copy Link</button>
        </div>
      </div>

      <div class="players-list">
        <h3>Players ({{ partyStore.party.players.length }})</h3>
        <ul>
          <li
            v-for="player in partyStore.party.players"
            :key="player.id"
            :class="{
              'is-host': player.id === partyStore.party?.hostId,
              'is-disconnected': !player.connected,
              'is-you': player.id === partyStore.playerId
            }"
          >
            <span class="player-name">
              {{ player.name }}
              <span v-if="player.id === partyStore.party?.hostId" class="badge">Host</span>
              <span v-if="player.id === partyStore.playerId" class="badge you">You</span>
              <span v-if="!player.connected" class="badge offline">Offline</span>
            </span>
            <span v-if="player.role" class="player-role">{{ player.role }}</span>

            <!-- Role assignment (host only) -->
            <select
              v-if="partyStore.isHost && player.id !== partyStore.playerId"
              @change="(e: Event) => handleSetRole(player.id, (e.target as HTMLSelectElement).value)"
              :value="player.role ?? ''"
              class="role-select"
            >
              <option value="">No Role</option>
              <option value="player">Player</option>
              <option value="spectator">Spectator</option>
            </select>
          </li>
        </ul>
      </div>

      <div class="lobby-actions">
        <button
          v-if="partyStore.isHost"
          @click="handleStart"
          :disabled="partyStore.loading"
          class="btn-primary"
        >
          {{ partyStore.loading ? "Starting..." : "Start Game" }}
        </button>
        <span v-else class="waiting-text">Waiting for host to start...</span>

        <button @click="handleLeave" class="btn-danger">Leave Party</button>
      </div>
    </div>

    <!-- Game View -->
    <div v-if="showGame && partyStore.party" class="game-view">
      <GameHost :party="partyStore.party" />
      <div class="game-actions">
        <button @click="handleLeave" class="btn-danger">Leave Game</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.party-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.error-banner {
  background-color: #e74c3c;
  color: white;
  padding: 12px 16px;
  border-radius: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.error-banner button {
  background: none;
  border: none;
  color: white;
  font-size: 1.2rem;
  cursor: pointer;
}

.join-form h2 {
  text-align: center;
  margin-bottom: 24px;
  color: #4fc3f7;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
}

.form-group input {
  width: 100%;
  padding: 12px;
  border: 2px solid #2d3a5c;
  border-radius: 8px;
  background-color: #0f1426;
  color: #eee;
  font-size: 1rem;
}

.form-group input:focus {
  outline: none;
  border-color: #4fc3f7;
}

.form-actions {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.action-group {
  text-align: center;
}

.action-group h3 {
  margin-bottom: 12px;
  font-size: 1rem;
  color: #aaa;
}

.divider {
  text-align: center;
  color: #666;
  font-style: italic;
}

.inline-form {
  display: flex;
  gap: 10px;
  justify-content: center;
}

.party-code-input {
  width: 120px;
  padding: 10px;
  text-align: center;
  text-transform: uppercase;
  font-weight: bold;
  letter-spacing: 2px;
  border: 2px solid #2d3a5c;
  border-radius: 8px;
  background-color: #0f1426;
  color: #eee;
}

button {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background-color: #4fc3f7;
  color: #0f1426;
}

.btn-primary:hover:not(:disabled) {
  background-color: #29b6f6;
}

.btn-secondary {
  background-color: #2d3a5c;
  color: #eee;
}

.btn-secondary:hover:not(:disabled) {
  background-color: #3d4a6c;
}

.btn-danger {
  background-color: #e74c3c;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background-color: #c0392b;
}

.btn-small {
  padding: 6px 12px;
  font-size: 0.85rem;
}

/* Lobby Styles */
.lobby-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 24px;
}

.lobby-header h2 {
  color: #4fc3f7;
}

.party-code {
  display: flex;
  align-items: center;
  gap: 12px;
  background-color: #0f1426;
  padding: 8px 16px;
  border-radius: 8px;
}

.party-code strong {
  font-size: 1.2rem;
  letter-spacing: 2px;
  color: #4fc3f7;
}

.players-list {
  background-color: #0f1426;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 24px;
}

.players-list h3 {
  margin-bottom: 12px;
  color: #aaa;
}

.players-list ul {
  list-style: none;
}

.players-list li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border-bottom: 1px solid #2d3a5c;
}

.players-list li:last-child {
  border-bottom: none;
}

.players-list li.is-disconnected {
  opacity: 0.5;
}

.player-name {
  display: flex;
  align-items: center;
  gap: 8px;
}

.badge {
  font-size: 0.75rem;
  padding: 2px 8px;
  border-radius: 4px;
  background-color: #4fc3f7;
  color: #0f1426;
}

.badge.you {
  background-color: #2ecc71;
}

.badge.offline {
  background-color: #95a5a6;
}

.player-role {
  color: #aaa;
  font-style: italic;
}

.role-select {
  padding: 6px;
  border-radius: 4px;
  background-color: #2d3a5c;
  color: #eee;
  border: none;
}

.lobby-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.waiting-text {
  color: #aaa;
  font-style: italic;
}

/* Game View */
.game-view {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.game-actions {
  display: flex;
  justify-content: flex-end;
}
</style>
