# Multi-stage build for Test Analytics Platform

# Stage 1: Build React frontend
FROM node:18-alpine AS frontend-build

WORKDIR /app/client

# Copy client package files
COPY client/package*.json ./

# Install client dependencies
RUN npm ci --only=production

# Copy client source
COPY client/ ./

# Build React app
RUN npm run build

# Stage 2: Build Node.js backend
FROM node:18-alpine AS backend-build

WORKDIR /app

# Copy backend package files
COPY package*.json ./

# Install backend dependencies
RUN npm ci --only=production

# Stage 3: Final production image
FROM node:18-alpine

WORKDIR /app

# Install curl for healthcheck
RUN apk add --no-cache curl

# Copy backend dependencies
COPY --from=backend-build /app/node_modules ./node_modules

# Copy backend source
COPY server/ ./server/
COPY package*.json ./
COPY *.js ./
COPY *.md ./
COPY *.sql ./

# Copy built frontend
COPY --from=frontend-build /app/client/build ./client/build

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1

# Start application
CMD ["node", "server/index.js"]

# Made with Bob
