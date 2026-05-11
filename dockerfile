# Dockerfile for Test Analytics Platform
# Runs both frontend (React dev server) and backend (Node.js) simultaneously

FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    curl \
    python3 \
    make \
    g++ \
    bash

# Copy package files for backend
COPY package*.json ./

# Clean npm cache and install backend dependencies
RUN npm cache clean --force && \
    npm install --no-optional --legacy-peer-deps && \
    npm rebuild

# Copy package files for frontend
COPY client/package*.json ./client/

# Install frontend dependencies
WORKDIR /app/client
RUN npm cache clean --force && \
    npm install --no-optional --legacy-peer-deps && \
    npm rebuild

# Go back to app root
WORKDIR /app

# Copy all source files
COPY server/ ./server/
COPY client/ ./client/
COPY *.js ./
COPY *.sql ./
COPY *.md ./
COPY start.sh ./

# Make start script executable
RUN chmod +x start.sh

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose ports
# 3000 for React development server
# 5000 for Node.js backend server
EXPOSE 3000 5000

# Health check for backend
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1

# Start both frontend and backend servers
CMD ["./start.sh"]

# Made with Bob
