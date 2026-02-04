FROM node:20-alpine AS builder

WORKDIR /app

# Install OpenSSL (Wajib buat Prisma di Alpine Linux)
RUN apk -U add --no-cache openssl

# Copy file dependency dulu (biar cache optimal)
COPY package*.json ./
COPY prisma ./prisma/

# Install semua dependencies (termasuk devDependencies)
RUN npm ci

# Generate Prisma Client (Wajib biar DB jalan)
RUN npx prisma generate

# Copy seluruh source code
COPY . .

# Build TypeScript ke JavaScript (biasanya ke folder dist)
RUN npm run build

# Apus dev dependencies
RUN npm prune --omit=dev

FROM node:20-alpine AS runner

WORKDIR /app

# Install OpenSSL lagi (buat runtime Prisma)
RUN apk -U add --no-cache openssl

# Set environment ke production
ENV NODE_ENV=production

USER node

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder --chown=node:node /app/public ./public

# Expose port (Internal container)
EXPOSE 8000

# Jalankan aplikasi
CMD ["npm", "start"]
