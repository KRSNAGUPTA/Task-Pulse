FROM node:20-alpine AS builder

WORKDIR /app

ENV NODE_ENV=development

COPY package*.json ./

COPY prisma ./prisma/

RUN npm ci

COPY . .
RUN npm run build


FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --only=production

COPY --from=builder /app/dist ./dist

EXPOSE 5001

CMD ["node", "dist/index.js"]