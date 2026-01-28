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
  });

  // Register platform handlers (party management)
  registerPartyHandlers(io);

  // Initialize game-specific namespaces
  initializeGameNamespaces(io);

  console.log(`[server] Platform server running on http://${HOST}:${PORT}`);
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
