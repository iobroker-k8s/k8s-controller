# Build stage
FROM node:24-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Copy "patch-package" files
COPY patches/ ./patches/

# Install dependencies
RUN npm install

# Copy source code
COPY tsconfig.json tsconfig.build.json ./
COPY src/ ./src/

# Build the application
RUN npm run build


# Production stage
FROM node:24-alpine AS production

# Create app user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy package files
COPY package*.json ./

# Copy "patch-package" files
COPY patches/ ./patches/

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy built application
COPY --from=builder /app/build ./build

# Change ownership to app user
RUN chown -R nodejs:nodejs /app
USER nodejs

# Set executable permissions on the main file
RUN chmod +x /app/build/index.js

# Set the entry point
ENTRYPOINT ["node", "/app/build/index.js"]