# Multi-stage build for Vue 3 frontend

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
COPY apps/platform-web ./apps/platform-web

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build the application
WORKDIR /app/apps/platform-web
RUN pnpm build

# Stage 2: Production stage with nginx
FROM nginx:alpine AS production

# Copy built assets from builder stage
COPY --from=builder /app/apps/platform-web/dist /usr/share/nginx/html

# Copy nginx configuration
COPY apps/platform-web/nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
