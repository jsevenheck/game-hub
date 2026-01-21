# Multi-stage build for Fastify backend

# Stage 1: Build stage
FROM node:22.12.0-alpine AS builder

# Install pnpm globally
RUN npm install -g pnpm@10.28.1

WORKDIR /app

# Copy workspace configuration files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY tsconfig.base.json tsconfig.json ./

# Copy all workspace packages
COPY packages ./packages
COPY apps/platform-server ./apps/platform-server

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build the application
WORKDIR /app/apps/platform-server
RUN pnpm build

# Stage 2: Production stage
FROM node:22.12.0-alpine AS production

# Install pnpm globally
RUN npm install -g pnpm@10.28.1

WORKDIR /app

# Copy package files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY tsconfig.base.json ./

# Copy workspace packages (needed for workspace dependencies)
COPY packages ./packages
COPY apps/platform-server/package.json ./apps/platform-server/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod --ignore-scripts

# Copy built application from builder stage
COPY --from=builder /app/apps/platform-server/dist ./apps/platform-server/dist

WORKDIR /app/apps/platform-server

# Expose port (default Fastify port)
EXPOSE 3000

# Set production environment
ENV NODE_ENV=production

# Start the application
CMD ["node", "dist/index.js"]
