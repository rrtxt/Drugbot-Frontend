FROM node:23-alpine AS base

WORKDIR /app

# Set the ENV from Docker Compose
ARG NEXT_PUBLIC_BACKEND_URL
ENV NEXT_PUBLIC_BACKEND_URL=${NEXT_PUBLIC_BACKEND_URL}

# Install dependencies
FROM base AS dependencies
COPY package*.json ./
RUN npm ci

# Development Image
FROM dependencies AS development
ENV NODE_ENV=development
CMD [ "npm", "run", "dev" ]

# Build the application
FROM dependencies AS builder
COPY . .
RUN npm run build

# Prod Image
FROM base AS runner
ENV NODE_ENV=production

# Add non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
USER nextjs

ENV NEXT_PUBLIC_BACKEND_URL=${NEXT_PUBLIC_BACKEND_URL}

# Copy built config
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

EXPOSE 3000

CMD [ "npm", "start" ]






