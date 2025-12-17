# client/Dockerfile
# 1) Build stage
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# 2) Production stage (nginx serving static files)
FROM nginx:stable-alpine
COPY --from=build /app/build /usr/share/nginx/html
# Optional: copy a custom nginx.conf if you need SPA routing
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
