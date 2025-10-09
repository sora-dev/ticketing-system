# Stage to provide MongoDB Database Tools
FROM mongo:6 AS mongotools

# Use Node.js 18 as base
FROM node:18-slim

# Install curl and CA certificates (needed for downloads)
RUN apt-get update && apt-get install -y \
    curl \
    ca-certificates \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy MongoDB Database Tools (mongodump/mongorestore) from official Mongo image
COPY --from=mongotools /usr/bin/mongodump /usr/local/bin/mongodump
COPY --from=mongotools /usr/bin/mongorestore /usr/local/bin/mongorestore

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Create uploads directory
RUN mkdir -p uploads/ticket-images

# Create backups directory
RUN mkdir -p backups

# Expose port
EXPOSE 5001

# Start the application
CMD ["npm", "start"]