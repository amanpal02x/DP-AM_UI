# Stage 1: Build the UI application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first for caching
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code and build config files
COPY tsconfig*.json ./
COPY index.html ./
COPY vite.config.* ./
COPY src ./src

# Build the React/Vite application
RUN npm run build

# Stage 2: Serve the application using Nginx (Unprivileged non-root container)
FROM nginxinc/nginx-unprivileged:stable-alpine AS runner

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy our custom Nginx server configuration template
# The docker-entrypoint will run envsubst on this template and write it to /etc/nginx/conf.d/default.conf
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

ENV PORT=8080

EXPOSE 8080

# The base image already has CMD ["nginx", "-g", "daemon off;"] configured
