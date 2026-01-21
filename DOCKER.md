# Docker Setup for Game-Hub

This guide explains how to use Docker to run the Game-Hub application in both development and production environments.

## Prerequisites

- Docker Engine 20.10+ or Docker Desktop
- Docker Compose 2.0+

## Project Structure

```
game-hub/
├── apps/
│   ├── platform-web/          # Frontend (Vue 3 + Vite)
│   │   ├── Dockerfile         # Production build
│   │   ├── Dockerfile.dev     # Development with hot reload
│   │   └── nginx.conf         # Nginx configuration for production
│   └── platform-server/       # Backend (Fastify + Socket.IO)
│       ├── Dockerfile         # Production build
│       └── Dockerfile.dev     # Development with hot reload
├── docker-compose.yml         # Development environment
├── docker-compose.prod.yml    # Production environment
└── .dockerignore              # Files to exclude from Docker builds
```

## Quick Start

### Development Environment

Run the application with hot reload enabled:

```bash
# Start all services
docker-compose up

# Start services in detached mode (background)
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

Access the application:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000

### Production Environment

Build and run optimized production containers:

```bash
# Build and start production services
docker-compose -f docker-compose.prod.yml up --build

# Start in detached mode
docker-compose -f docker-compose.prod.yml up -d

# Stop production services
docker-compose -f docker-compose.prod.yml down
```

Access the application:
- Frontend: http://localhost
- Backend API: http://localhost:3000

## Configuration

### Environment Variables

Copy the example files and modify as needed:

```bash
# Backend configuration
cp apps/platform-server/.env.example apps/platform-server/.env

# Frontend configuration
cp apps/platform-web/.env.example apps/platform-web/.env
```

#### Backend (.env)
```env
PORT=3000
HOST=0.0.0.0
CORS_ORIGIN=http://localhost:5173
NODE_ENV=development
SOCKETIO_PATH=/socket.io
SOCKETIO_CORS_ORIGIN=http://localhost:5173
```

#### Frontend (.env)
```env
VITE_API_URL=http://localhost:3000
VITE_SOCKET_URL=http://localhost:3000
```

## Docker Commands Reference

### Building Images

```bash
# Build all services
docker-compose build

# Build specific service
docker-compose build platform-web
docker-compose build platform-server

# Build without cache
docker-compose build --no-cache
```

### Managing Containers

```bash
# List running containers
docker-compose ps

# View logs
docker-compose logs platform-web
docker-compose logs platform-server

# Restart services
docker-compose restart

# Execute commands in containers
docker-compose exec platform-server sh
docker-compose exec platform-web sh
```

### Cleaning Up

```bash
# Stop and remove containers
docker-compose down

# Remove containers and volumes
docker-compose down -v

# Remove containers, volumes, and images
docker-compose down -v --rmi all

# Clean up unused Docker resources
docker system prune -a
```

## Development Workflow

### Hot Reload

Both frontend and backend support hot reload in development mode:

1. Make changes to source files in `apps/platform-web/src` or `apps/platform-server/src`
2. Changes are automatically detected and reflected in the running containers
3. No need to rebuild or restart containers

### Installing Dependencies

If you add new dependencies to `package.json`:

```bash
# Rebuild the affected service
docker-compose build platform-web  # or platform-server

# Restart the service
docker-compose up -d platform-web  # or platform-server
```

## Production Deployment

### Multi-stage Builds

Production Dockerfiles use multi-stage builds to create optimized images:

1. **Builder Stage**: Installs all dependencies and builds the application
2. **Production Stage**: Contains only production dependencies and built artifacts

Benefits:
- Smaller image size
- Faster deployment
- Better security (fewer dependencies)

### Frontend (Nginx)

The production frontend serves static assets using Nginx:
- Gzip compression enabled
- SPA routing support (Vue Router)
- Security headers configured
- Static asset caching

### Backend (Node.js)

The production backend runs the compiled JavaScript:
- Production dependencies only
- NODE_ENV=production
- Health check endpoint

## Troubleshooting

### Port Already in Use

If ports 3000 or 5173 are already in use:

```bash
# Find process using the port
lsof -i :3000
lsof -i :5173

# Kill the process or change port in docker-compose.yml
```

### Permission Issues

On Linux, you may need to run Docker commands with sudo or add your user to the docker group:

```bash
sudo usermod -aG docker $USER
# Log out and back in for changes to take effect
```

### Container Won't Start

Check logs for errors:

```bash
docker-compose logs platform-web
docker-compose logs platform-server
```

### Rebuild from Scratch

If you encounter persistent issues:

```bash
# Stop everything
docker-compose down -v

# Remove all game-hub images
docker images | grep game-hub | awk '{print $3}' | xargs docker rmi -f

# Rebuild
docker-compose build --no-cache
docker-compose up
```

## Health Checks

Both services include health checks:

```bash
# Check frontend health
curl http://localhost/health

# Check backend health (when implemented)
curl http://localhost:3000/health
```

## Performance Tips

1. **Use .dockerignore**: Excludes unnecessary files from Docker context
2. **Layer caching**: Organize Dockerfile commands to maximize cache hits
3. **Multi-stage builds**: Keep production images lean
4. **Volume mounts**: Use for development hot reload only, not production

## Architecture

### Development Setup
```
┌─────────────────┐         ┌──────────────────┐
│   Host Machine  │         │  Docker Network  │
│                 │         │                  │
│  localhost:5173 ├────────►│  platform-web    │
│                 │         │  (Vite Dev)      │
│  localhost:3000 ├────────►│  platform-server │
│                 │         │  (Fastify)       │
└─────────────────┘         └──────────────────┘
```

### Production Setup
```
┌─────────────────┐         ┌──────────────────┐
│   Host Machine  │         │  Docker Network  │
│                 │         │                  │
│  localhost:80   ├────────►│  platform-web    │
│                 │         │  (Nginx)         │
│  localhost:3000 ├────────►│  platform-server │
│                 │         │  (Node.js)       │
└─────────────────┘         └──────────────────┘
```

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Node.js Docker Best Practices](https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md)
- [Vite Docker Guide](https://vitejs.dev/guide/static-deploy.html)

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review Docker logs: `docker-compose logs`
3. Open an issue on the GitHub repository
