# Build stage
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy built app
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/templates/default.conf.template

# When run, Cloud Run provides the PORT environment variable.
# We substitute __PORT__ in the template with the true PORT at runtime,
# ensuring Nginx listens on the correct port as required by Google Cloud.
CMD ["/bin/sh" , "-c" , "envsubst < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf && exec nginx -g 'daemon off;'"]
