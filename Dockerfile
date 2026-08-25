# Multi-stage build for optimal production image size and security
# Stage 1: Build static web assets and compile CJS backend
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package descriptors first to maximize layer caching
COPY package.json package-lock.json ./
RUN npm ci

# Copy full source and configuration files
COPY . .

# Run build script to generate static 'dist/' folder and compiled 'dist/server.cjs'
RUN npm run build

# Stage 2: Clean production runtime image
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Install only production dependencies
COPY package.json package-lock.json ./
RUN npm ci --only=production

# Copy compiled build assets from previous stage
COPY --from=builder /app/dist ./dist

# Expose port 3000 (required by Cloud Run reverse proxy ingress)
EXPOSE 3000

# Run as non-root user for enhanced runtime security
USER node

# Start the enterprise Node server
CMD ["node", "dist/server.cjs"]
