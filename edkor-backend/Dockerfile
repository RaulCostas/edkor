# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build
RUN npm prune --production

# Stage 2: Production Runner
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

RUN apk add --no-cache tzdata

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Directorios para datos persistentes (subidas y sesión WhatsApp)
RUN mkdir -p uploads wa_auth_info

EXPOSE 3001

CMD ["sh", "-c", "if [ -f dist/src/main.js ]; then node dist/src/main; else node dist/main; fi"]
