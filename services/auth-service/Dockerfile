# --- STAGE 1: Build Stage ---
FROM node:20-alpine AS builder

WORKDIR /app

ENV NODE_ENV=development

COPY package*.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

RUN npm ci

COPY . .
RUN npm run build


# --- STAGE 2: Production Runner Stage ---
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

RUN npm ci --only=production

COPY --from=builder /app/dist ./dist

EXPOSE 5001

# Automatically push schema to PostgreSQL on boot, then start the server
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]