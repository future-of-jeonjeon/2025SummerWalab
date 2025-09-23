# --- build stage ---
FROM node:16-alpine AS build
RUN apk add --no-cache git
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build:dll || true

RUN npm run build

RUN set -eux; \
    if [ -d /app/static ]; then \
      echo "Copying built static assets -> /app/dist/static"; \
      mkdir -p /app/dist/static; \
      cp -a /app/static/. /app/dist/static/; \
    else \
      echo "No /app/static directory found; skipping"; \
    fi

RUN set -eux; \
    if [ -d /app/static/js ]; then \
      echo "Also copying JS bundles to /app/dist root for absolute-path script tags"; \
      find /app/static/js -maxdepth 1 -type f -name "*.js" -exec cp {} /app/dist/ \; ; \
    else \
      echo "No /app/static/js directory found; skipping root js copy"; \
    fi

RUN set -eux; \
    mkdir -p /app/dist; \
    DLL_JS=$(find /app -type f -name "vendor.dll*.js" | head -n 1 || true); \
    if [ -n "$DLL_JS" ]; then \
      echo "Copying DLL: $DLL_JS -> /app/dist/"; \
      cp "$DLL_JS" /app/dist/; \
      DLL_MAP=$(echo "$DLL_JS" | sed 's/\.js$/\.js.map/'); \
      if [ -f "$DLL_MAP" ]; then cp "$DLL_MAP" /app/dist/; fi; \
    else \
      echo "No vendor.dll*.js found; continuing"; \
    fi

# --- run stage ---
FROM nginx:alpine AS run

RUN apk add --no-cache gettext

# Nginx listens on 3000 to match docker-compose (8080:3000)
RUN sed -i 's/listen       80;/listen       3000;/' /etc/nginx/conf.d/default.conf || true

# Overwrite default server config with SPA-friendly rules
RUN rm -f /etc/nginx/conf.d/default.conf
RUN printf '%s\n' \
    'server { \
    listen 3000; \
    server_name _; \
    root /usr/share/nginx/html; \
    index index.html; \
     \
    location /api/ { \
        proxy_pass ${TARGET}/api/;
 \
        proxy_set_header X-Real-IP $remote_addr;
 \
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
 \
        proxy_set_header Host $http_host;
 \
    } \
     \
    # Serve static assets and bundles as-is; if missing, 404 (avoid HTML fallback for .js) \
    location ~* \.(js|css|map|png|jpg|jpeg|gif|svg|webp|ico|woff2?|ttf|eot)$ { \
        try_files $uri =404; \
        access_log off; \
    } \
     \
    # Optional: cache headers for static assets \
    location ~* \.(js|css|png|jpg|jpeg|gif|svg|webp|ico|woff2?|ttf|eot)$ { \
        expires 7d; \
        add_header Cache-Control "public, max-age=604800"; \
    } \
     \
    # SPA fallback only for routes WITHOUT an extension \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
}' \
    > /etc/nginx/conf.d/default.conf.template

# Copy built assets
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 3000
CMD ["/bin/sh", "-c", "envsubst < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]