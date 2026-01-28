<script setup lang="ts">
import { computed, defineAsyncComponent } from "vue";
import type { Party } from "@game-hub/platform-sdk";
import { getGameUI } from "../gameRegistry";

const props = defineProps<{
  party: Party;
}>();

const gameRegistration = computed(() => getGameUI(props.party.gameId));

// Placeholder component when no game is registered
const PlaceholderGame = defineAsyncComponent(() =>
  Promise.resolve({
    template: `
      <div class="placeholder-game">
        <h3>🎮 Game Started!</h3>
        <p>Game ID: <strong>{{ gameId }}</strong></p>
        <p>No game UI registered for this game.</p>
        <p class="hint">Games can be plugged in by registering their Vue component in the game registry.</p>
      </div>
    `,
    props: ["gameId"],
  })
);
</script>

<template>
  <div class="game-host">
    <div class="game-header">
      <h2>{{ gameRegistration?.definition.name ?? "Game" }}</h2>
      <span class="game-status">In Progress</span>
    </div>

    <div class="game-container">
      <component
        v-if="gameRegistration"
        :is="gameRegistration.component"
        :party="party"
      />
      <PlaceholderGame v-else :gameId="party.gameId" />
    </div>
  </div>
</template>

<style scoped>
.game-host {
  background-color: #0f1426;
  border-radius: 8px;
  overflow: hidden;
}

.game-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background-color: #2d3a5c;
}

.game-header h2 {
  color: #4fc3f7;
  font-size: 1.2rem;
}

.game-status {
  background-color: #2ecc71;
  color: white;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 0.85rem;
  font-weight: 600;
}

.game-container {
  padding: 24px;
  min-height: 200px;
}

.placeholder-game {
  text-align: center;
  color: #aaa;
}

.placeholder-game h3 {
  font-size: 1.5rem;
  margin-bottom: 16px;
  color: #4fc3f7;
}

.placeholder-game p {
  margin-bottom: 8px;
}

.placeholder-game strong {
  color: #eee;
}

.placeholder-game .hint {
  margin-top: 16px;
  font-size: 0.9rem;
  font-style: italic;
  color: #666;
}
</style>
