# Development stage
FROM node:18-alpine AS development

# Install security updates and development tools
RUN apk update && apk upgrade && apk add --no-cache dumb-init curl

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies (including dev dependencies)
RUN npm install

# Create necessary directories
RUN mkdir -p /app/logs /app/uploads

# Expose port and debug port
EXPOSE 3001 9229

# Start development server with nodemon
CMD ["npm", "run", "dev"]

# Builder stage for production
FROM node:18-alpine AS builder

# Install security updates
RUN apk update && apk upgrade && apk add --no-cache dumb-init

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm install

# Copy source code
COPY src/ ./src/

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Install security updates and dumb-init for proper signal handling
RUN apk update && apk upgrade && apk add --no-cache dumb-init curl

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm install --only=production && \
    npm cache clean --force && \
    rm -rf ~/.npm

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

# Create necessary directories and set permissions
RUN mkdir -p /app/logs /app/uploads && \
    chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3001

# Health check with proper endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/index.js"]