# syntax=docker/dockerfile:1
FROM node:18-alpine

WORKDIR /app

COPY package.json package-lock.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Copy server code
COPY server ./server

ENV NODE_ENV=production

CMD ["node", "server/google-cloud-api/reCaptcha.js"]
