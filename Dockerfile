# Build stage
FROM node:22-alpine AS builder

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
CMD ["/bin/sh" , "-c" , "find /usr/share/nginx/html/assets -name '*.js' -exec sed -i \"s|__CLOUD_SUPABASE_URL__|${VITE_SUPABASE_URL}|g\" {} + && find /usr/share/nginx/html/assets -name '*.js' -exec sed -i \"s|__CLOUD_SUPABASE_ANON_KEY__|${VITE_SUPABASE_ANON_KEY}|g\" {} + && sed s/__PORT__/${PORT:-8080}/g /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf && exec nginx -g 'daemon off;'"]
