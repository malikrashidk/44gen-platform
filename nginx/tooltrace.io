server {
    listen 8080;
    server_name tooltrace.io www.tooltrace.io;
    return 301 https://tooltrace.io$request_uri;
}

server {
    listen 8443 ssl;
    server_name www.tooltrace.io;
    ssl_certificate /etc/letsencrypt/live/tooltrace.io/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tooltrace.io/privkey.pem;
    return 301 https://tooltrace.io$request_uri;
}

server {
    listen 8443 ssl;
    server_name tooltrace.io;
    root /var/www/tooltrace.io/public_html;
    index index.php index.html;

    ssl_certificate /etc/letsencrypt/live/tooltrace.io/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tooltrace.io/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    location / { try_files $uri $uri/ /index.php?$args; }

    location ~ \.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/run/php/php8.3-fpm.sock;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location ~ /\.ht { deny all; }

    error_log /var/log/nginx/tooltrace-error.log;
    access_log /var/log/nginx/tooltrace-access.log;
}
