# Development Dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies
# Layer is cached unless package*.json changes
COPY package*.json ./
RUN npm ci --prefer-offline --no-audit --legacy-peer-deps || npm install --prefer-offline --no-audit --legacy-peer-deps

# Copy source (this layer invalidates only when code changes)
COPY . .

# Expose Vite dev server port
EXPOSE 5173

# Start dev server
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]









