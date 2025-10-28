FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

ARG VITE_MS_API_BASE=/ms-api
ENV VITE_MS_API_BASE=$VITE_MS_API_BASE

ARG VITE_CODE_AUTO_SAVE_INTERVAL_SECONDS=5
ENV VITE_CODE_AUTO_SAVE_INTERVAL_SECONDS=$VITE_CODE_AUTO_SAVE_INTERVAL_SECONDS

ARG VITE_CODE_AUTO_SAVE_CACHE_TTL_SECONDS=10
ENV VITE_CODE_AUTO_SAVE_CACHE_TTL_SECONDS=$VITE_CODE_AUTO_SAVE_CACHE_TTL_SECONDS

RUN npm run build

FROM nginx:1.27-alpine AS run

RUN apk add --no-cache gettext

ENV FRONT_PORT=8080
ENV BACKEND_API=http://oj-backend:8000
ENV MICRO_API=http://oj-micro-service:8000

RUN rm -f /etc/nginx/conf.d/default.conf
RUN <<'EOF' cat > /etc/nginx/conf.d/default.conf.template
server {
    listen ${FRONT_PORT};
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    location /api/ {
        proxy_pass ${BACKEND_API}/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_redirect off;
        proxy_connect_timeout 5s;
        proxy_read_timeout 300s;
    }

    location /ms-api/ {
        proxy_pass ${MICRO_API}/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_redirect off;
        proxy_connect_timeout 5s;
        proxy_read_timeout 300s;
    }

    location ~* \.(js|css|map|png|jpg|jpeg|gif|svg|webp|ico|woff2?|ttf|eot)$ {
        try_files $uri =404;
        expires 7d;
        add_header Cache-Control "public, max-age=604800";
        access_log off;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
EOF

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080

CMD ["/bin/sh", "-c", "envsubst '${FRONT_PORT} ${BACKEND_API} ${MICRO_API}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]
