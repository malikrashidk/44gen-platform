# Redirect bare HTTP to HTTPS
server {
    listen 8080;
    server_name 44gen.com www.44gen.com;
    return 301 https://44gen.com$request_uri;
}

# Redirect www to non-www
server {
    listen 8443 ssl;
    server_name www.44gen.com;
    ssl_certificate /etc/letsencrypt/live/44gen.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/44gen.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    return 301 https://44gen.com$request_uri;
}

# Main platform
server {
    listen 8443 ssl;
    server_name 44gen.com;

    ssl_certificate /etc/letsencrypt/live/44gen.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/44gen.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    root /var/www/44gen/app;
    index index.html;

    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_buffers 16 8k;
    gzip_http_version 1.1;
    gzip_min_length 256;
    gzip_types
        text/plain
        text/css
        text/javascript
        application/javascript
        application/json
        application/x-javascript
        text/xml
        application/xml
        image/svg+xml;

    location / {
        try_files $uri $uri/ /index.html;

        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
            add_header Vary "Accept-Encoding";
        }
    }

    location /api/ {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto https;
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
        proxy_cache_bypass $http_upgrade;
        proxy_buffering off;
        proxy_cache off;
    }

    error_log /var/log/nginx/44gen-error.log;
    access_log /var/log/nginx/44gen-access.log;
}

# Wildcard subdomains for user apps
server {
    listen 8443 ssl;
    server_name ~^(?<username>.+)\.44gen\.com$;

    ssl_certificate /etc/letsencrypt/live/44gen.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/44gen.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    root /var/www/44gen/users/$username/current;
    index index.html;

    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_buffers 16 8k;
    gzip_http_version 1.1;
    gzip_min_length 256;
    gzip_types
        text/plain
        text/css
        text/javascript
        application/javascript
        application/json
        application/x-javascript
        text/xml
        application/xml
        image/svg+xml;

    location / {
        try_files $uri $uri/ /index.html;

        location ~* \.html$ {
            expires -1;
            add_header Cache-Control "no-cache, no-store, must-revalidate";
        }

        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
            add_header Vary "Accept-Encoding";
        }
    }

    error_log /var/log/nginx/44gen-users-error.log;
    access_log /var/log/nginx/44gen-users-access.log;
}
