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

# ---- Serve stage ----
FROM nginx:alpine

# Static files from the Vite build
COPY --from=build /app/dist /usr/share/nginx/html

# nginx config template — envsubst replaces ${PORT} at container start (Railway sets PORT)
COPY nginx.conf /etc/nginx/templates/default.conf.template

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
