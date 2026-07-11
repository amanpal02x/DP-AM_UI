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
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_API_BASE_URL
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
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
