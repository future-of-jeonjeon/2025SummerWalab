# --- build stage ---
FROM node:16-alpine AS build
RUN apk add --no-cache git
WORKDIR /app

ARG VUE_APP_GOOGLE_CLIENT_ID
ARG VUE_APP_GOOGLE_CLIENT_SECRET
ARG VUE_APP_GOOGLE_REDIRECT_URI
ENV VUE_APP_GOOGLE_CLIENT_ID=$VUE_APP_GOOGLE_CLIENT_ID
ENV VUE_APP_GOOGLE_CLIENT_SECRET=$VUE_APP_GOOGLE_CLIENT_SECRET
ENV VUE_APP_GOOGLE_REDIRECT_URI=$VUE_APP_GOOGLE_REDIRECT_URI

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
# Nginx listens on 8080 (deploy.sh expects container to serve on 8080)
RUN sed -i 's/listen       80;/listen       8080;/' /etc/nginx/conf.d/default.conf || true

# Overwrite default server config with SPA-friendly rules
RUN rm -f /etc/nginx/conf.d/default.conf
RUN <<'EOF' cat > /etc/nginx/conf.d/default.conf.template
server {
    listen 8080;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # Backend API proxy

    location /api/ {
        proxy_pass ${TARGET}/api/;
        proxy_set_header Host ${TARGET_HOST};
        proxy_set_header X-Forwarded-Host ${TARGET_HOST};
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_connect_timeout 5s;
        proxy_read_timeout 300s;
    }

    # Static assets: serve as-is; attempt alternate common build paths before 404
    location ~* \.(js|css|map|png|jpg|jpeg|gif|svg|webp|ico|woff2?|ttf|eot)$ {
        # Try requested path, then /static/<same>, then /static/js/<same>
        try_files $uri /static$uri /static/js$uri =404;
        expires 7d;
        add_header Cache-Control "public, max-age=604800";
        access_log off;
    }

    # SPA fallback only for routes WITHOUT an extension
    location / {
        try_files $uri $uri/ /index.html;
    }
}
EOF

# Copy built assets
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080
CMD ["/bin/sh", "-c", "if [ -z \"$TARGET_HOST\" ]; then TARGET_HOST='\\$host'; fi; export TARGET_HOST; envsubst '$TARGET $TARGET_HOST' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]
