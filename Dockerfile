# Build stage
FROM node:24-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/
COPY tsconfig.json ./

# Install build dependencies
RUN npm install --save-dev typescript esbuild

# Build the application
RUN npm run build

# Production stage
FROM node:24-alpine AS production

# Create app user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy built application
COPY --from=builder /app/build ./build

# Change ownership to app user
RUN chown -R nextjs:nodejs /app
USER nextjs

# Set executable permissions on the main file
RUN chmod +x /app/build/index.js

# Set the entry point
ENTRYPOINT ["node", "/app/build/index.js"]