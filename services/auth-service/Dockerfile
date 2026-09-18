# --- STAGE 1: Base Stage (Shared dependencies setup) ---
FROM node:20-alpine AS base
WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

# --- STAGE 2: Development Stage (Used for local dev & Compose Watch) ---
FROM base AS dev
ENV NODE_ENV=development
RUN npm ci
COPY . .
EXPOSE 5001
CMD ["npm", "run", "dev"]

# --- STAGE 3: Builder Stage (Compiles TypeScript/Prisma for prod) ---
FROM base AS builder
ENV NODE_ENV=development
RUN npm ci
COPY . .
RUN npm run build

# --- STAGE 4: Production Runner Stage (Minimal production runtime) ---
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

# Install production dependencies only
RUN npm ci --omit=dev

# Copy compiled JavaScript
COPY --from=builder /app/dist ./dist

EXPOSE 5001

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]