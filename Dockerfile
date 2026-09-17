# ---- Build stage ----
FROM node:20-alpine AS build
WORKDIR /app

# Install dependencies first for better layer caching
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# Build-time env vars — Vite inlines these into the JS bundle during the build.
# Pass with: docker build --build-arg VITE_SPOTIFY_CLIENT_ID=... .
ARG VITE_SPOTIFY_CLIENT_ID=""
ARG VITE_APPLE_MUSIC_TOKEN=""
ENV VITE_SPOTIFY_CLIENT_ID=$VITE_SPOTIFY_CLIENT_ID
ENV VITE_APPLE_MUSIC_TOKEN=$VITE_APPLE_MUSIC_TOKEN

# Build the Vite SPA
COPY . .
RUN npm run build

# ---- Serve stage: single Node process serves the API + static SPA ----
FROM node:20-alpine
WORKDIR /app

ENV NODE_ENV=production

# Production deps only (express, pg, …)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

# Backend + built frontend
COPY server/ ./server/
COPY --from=build /app/dist ./dist

# Railway provides PORT at runtime; the server defaults to 7100 locally
EXPOSE 8080

CMD ["node", "server/index.js"]
