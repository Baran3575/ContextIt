# --- BUILD STAGE ---
FROM node:20-alpine AS builder

# Install Python and build dependencies
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files and install all dependencies (including dev)
COPY package*.json tsconfig.json ./
RUN npm ci

# Copy source code and build the project
COPY src/ ./src
RUN npm run build

# Remove development dependencies to keep output small
RUN npm prune --production

# --- RUNNER STAGE ---
FROM node:20-alpine

# Install Python 3 for the python code parsing engine
RUN apk add --no-cache python3

WORKDIR /app

# Copy built code and production-only dependencies
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Copy python parser scripts which are loaded dynamically at runtime
COPY src/parser/pyParser.py ./dist/parser/pyParser.py
COPY src/parser/pyParser.py ./src/parser/pyParser.py

# Expose Stdio or other ports if HTTP/SSE transport is added later
# MCP Stdio transport communicates over stdout/stdin
ENV NODE_ENV=production

# Run the MCP server by default
CMD ["node", "dist/mcp/mcpServer.js"]
