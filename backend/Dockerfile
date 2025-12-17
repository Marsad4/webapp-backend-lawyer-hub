# backend/Dockerfile
FROM node:18-alpine
WORKDIR /usr/src/app

# copy package files first for better caching
COPY package*.json ./
RUN npm ci --only=production

# copy source
COPY . .

ENV PORT=5000
EXPOSE 5000

CMD ["node", "server.js"]
