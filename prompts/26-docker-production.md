# Prompt 26 — Docker Production Build + Deployment

## Context
The chess platform is fully built, polished, and responsive. This final step prepares it for production deployment with optimized Docker images, Nginx configuration, and production-ready settings.

## What to Build
Production Dockerfiles, Nginx reverse proxy config, environment-based configuration, and a complete docker-compose for production.

## Prompt

```text
Finalize the Docker setup for production deployment.

=== FRONTEND PRODUCTION DOCKERFILE — /frontend/Dockerfile ===

Multi-stage build:

# Stage 1: Build
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --production=false
COPY . .
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:1.25-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

=== NGINX CONFIG — /frontend/nginx.conf ===

server {
    listen 80;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    # Serve static files with cache
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Proxy API requests to backend
    location /api/ {
        proxy_pass http://backend:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Proxy SignalR hub with WebSocket support
    location /hubs/ {
        proxy_pass http://backend:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;   # 24 hours for WebSocket
    }

    # Serve Stockfish WASM with correct MIME type
    location /stockfish/ {
        types {
            application/wasm wasm;
        }
        add_header Cross-Origin-Opener-Policy same-origin;
        add_header Cross-Origin-Embedder-Policy require-corp;
    }

    # SPA fallback — serve index.html for client-side routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript application/wasm;
    gzip_min_length 1000;
}

=== BACKEND PRODUCTION DOCKERFILE — /backend/ChessPlatform.Api/Dockerfile ===

Multi-stage build (update the existing one if needed):

# Stage 1: Build
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY *.csproj ./
RUN dotnet restore
COPY . .
RUN dotnet publish -c Release -o /app --no-restore

# Stage 2: Run
FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /app .

# Run as non-root user
RUN adduser --disabled-password --gecos "" appuser
USER appuser

ENV ASPNETCORE_URLS=http://+:5000
ENV ASPNETCORE_ENVIRONMENT=Production
EXPOSE 5000
ENTRYPOINT ["dotnet", "ChessPlatform.Api.dll"]

=== BACKEND PRODUCTION CONFIGURATION ===

Update Program.cs for production:
- Do NOT auto-migrate in production.
- Configure CORS to only allow the production frontend origin (from environment variable).
- Enforce HTTPS redirect headers (trust proxy X-Forwarded-Proto).
- Set JWT cookie to Secure=true, SameSite=Strict in production.
- Configure Serilog (or default logging) with structured JSON output.

appsettings.Production.json:
{
  "Logging": {
    "LogLevel": { "Default": "Information", "Microsoft.AspNetCore": "Warning" }
  },
  "AllowedOrigins": "https://your-domain.com"
}

=== DOCKER COMPOSE PRODUCTION — /docker-compose.prod.yml ===

version: "3.8"

services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - backend
    restart: unless-stopped

  backend:
    build:
      context: ./backend/ChessPlatform.Api
      dockerfile: Dockerfile
    environment:
      - ConnectionStrings__DefaultConnection=Host=postgres;Database=chessplatform;Username=chess;Password=${DB_PASSWORD}
      - Auth__Google__ClientId=${GOOGLE_CLIENT_ID}
      - Auth__Google__ClientSecret=${GOOGLE_CLIENT_SECRET}
      - Auth__GitHub__ClientId=${GITHUB_CLIENT_ID}
      - Auth__GitHub__ClientSecret=${GITHUB_CLIENT_SECRET}
      - Auth__Jwt__Secret=${JWT_SECRET}
      - AllowedOrigins=${ALLOWED_ORIGINS}
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped

  postgres:
    image: postgres:16-alpine
    environment:
      - POSTGRES_DB=chessplatform
      - POSTGRES_USER=chess
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U chess -d chessplatform"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  # Daily database backup
  db-backup:
    image: postgres:16-alpine
    environment:
      - PGPASSWORD=${DB_PASSWORD}
    volumes:
      - ./backups:/backups
    entrypoint: >
      sh -c "while true; do
        pg_dump -h postgres -U chess chessplatform > /backups/backup_$$(date +%Y%m%d_%H%M%S).sql;
        find /backups -name '*.sql' -mtime +7 -delete;
        sleep 86400;
      done"
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped

volumes:
  pgdata:

=== PRODUCTION .env.example ===

DB_PASSWORD=<strong-random-password>
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>
GITHUB_CLIENT_ID=<your-github-client-id>
GITHUB_CLIENT_SECRET=<your-github-client-secret>
JWT_SECRET=<random-256-bit-base64-string>
ALLOWED_ORIGINS=https://your-domain.com

=== DATABASE MIGRATION SCRIPT ===

Create /scripts/migrate.sh:
#!/bin/bash
# Run EF Core migrations against the production database.
# Execute before deploying a new version.
docker compose -f docker-compose.prod.yml exec backend dotnet ef database update

=== README.md (at project root) ===

Create/update README with:
- Project description
- Prerequisites (Docker, Docker Compose)
- Development setup:
  1. Copy .env.example to .env, fill in OAuth credentials.
  2. `docker-compose up` → app at http://localhost:5173 (dev) 
- Production deployment:
  1. Copy .env.example to .env with production values.
  2. `docker-compose -f docker-compose.prod.yml up -d`
  3. App at http://localhost (or behind your reverse proxy / domain).
- Running migrations
- Running tests

Verify:
1. `docker-compose -f docker-compose.prod.yml build` succeeds.
2. `docker-compose -f docker-compose.prod.yml up` starts all services.
3. http://localhost serves the frontend.
4. API calls (/api/health, /api/auth/*) proxy correctly to the backend.
5. WebSocket connections (/hubs/game) work through Nginx.
6. Stockfish WASM loads correctly with proper headers.
7. Database backup container runs.
8. The full game flow works end-to-end in the production Docker setup.
```
