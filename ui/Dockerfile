# Build stage
FROM node:18 AS build-stage
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Production stage
FROM nginx:stable-alpine
COPY --from=build-stage /app/dist /usr/share/nginx/html

# Copy the custom nginx configuration template
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# Default backend host for local development
ENV BACKEND_HOST=localhost

EXPOSE 8001
CMD ["nginx", "-g", "daemon off;"]
