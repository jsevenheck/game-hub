import Fastify from "fastify";
import cors from "@fastify/cors";
import { Server } from "socket.io";
import { registerPartyHandlers } from "./platform/party.socket.js";
import { initializeGameNamespaces, getAllGames } from "./games/registry.js";

const PORT = parseInt(process.env["PORT"] ?? "3000", 10);
const HOST = process.env["HOST"] ?? "0.0.0.0";
const CORS_ORIGIN = process.env["CORS_ORIGIN"] ?? "http://localhost:5173";

async function main() {
  const fastify = Fastify({
    logger: true,
  });

  // Register CORS
  await fastify.register(cors, {
    origin: CORS_ORIGIN,
    credentials: true,
  });

  // Health check endpoint
  fastify.get("/health", async () => {
    return { status: "ok" };
  });

  // List available games
  fastify.get("/games", async () => {
    return { games: getAllGames() };
  });

  // Start HTTP server
  await fastify.listen({ port: PORT, host: HOST });

  // Create Socket.IO server
  const io = new Server(fastify.server, {
    cors: {
      origin: CORS_ORIGIN,
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
    // Heartbeat settings for faster dead connection detection
    pingInterval: 10000, // Send ping every 10 seconds
    pingTimeout: 5000,   // Wait 5 seconds for pong before considering connection dead
  });

  // Register platform handlers on /platform namespace
  registerPartyHandlers(io);

  // Initialize game-specific namespaces (uses /g/<gameId> convention)
  initializeGameNamespaces(io);

  console.log(`[server] Platform server running on http://${HOST}:${PORT}`);
  console.log(`[server] Platform namespace: /platform`);
  console.log(`[server] Game namespaces: /g/<gameId>`);
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
