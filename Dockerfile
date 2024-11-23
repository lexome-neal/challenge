FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

ENV PORT=8080
EXPOSE 8080

# Start webhook server
CMD ["npm", "run", "startWebhookServer"]
