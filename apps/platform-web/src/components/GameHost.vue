<script setup lang="ts">
import { computed, defineAsyncComponent, type Component } from "vue";
import type { GameSessionContext } from "../stores/party";
import { getGameUI } from "../gameRegistry";

const props = defineProps<{
  ctx: GameSessionContext;
}>();

// Get registered game UI if available
const gameRegistration = computed(() => getGameUI(props.ctx.gameId));

// Dynamic game component - tries to load from registry first, then falls back to async import
const GameComponent = computed<Component | null>(() => {
  if (gameRegistration.value) {
    return gameRegistration.value.component;
  }
  
  // Try to dynamically import the game module (future extensibility)
  // This allows games to be lazy-loaded without pre-registration
  // For now, return null to show placeholder
  return null;
});

const gameName = computed(() => {
  return gameRegistration.value?.definition.name ?? props.ctx.gameId;
});
</script>

<template>
  <div class="game-host">
    <div class="game-header">
      <h2>{{ gameName }}</h2>
      <span class="game-status">In Progress</span>
    </div>

    <div class="game-container">
      <!-- Render the game component with ctx props -->
      <component
        v-if="GameComponent"
        :is="GameComponent"
        :gameId="ctx.gameId"
        :sessionId="ctx.sessionId"
        :joinToken="ctx.joinToken"
        :wsNamespace="ctx.wsNamespace"
        :apiBaseUrl="ctx.apiBaseUrl"
      />
      
      <!-- Placeholder when no game UI is registered -->
      <div v-else class="placeholder-game">
        <h3>🎮 Game Started!</h3>
        <p>Game ID: <strong>{{ ctx.gameId }}</strong></p>
        <p>Session ID: <strong>{{ ctx.sessionId }}</strong></p>
        <p class="namespace">WebSocket Namespace: <code>{{ ctx.wsNamespace }}</code></p>
        <p class="hint">
          No game UI registered for "{{ ctx.gameId }}".
          <br />
          Games can be plugged in by registering their Vue component in the game registry.
        </p>
      </div>
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

.placeholder-game code {
  background-color: #2d3a5c;
  padding: 2px 8px;
  border-radius: 4px;
  font-family: monospace;
  color: #4fc3f7;
}

.placeholder-game .namespace {
  margin-top: 16px;
}

.placeholder-game .hint {
  margin-top: 24px;
  font-size: 0.9rem;
  font-style: italic;
  color: #666;
  line-height: 1.6;
}
</style>
