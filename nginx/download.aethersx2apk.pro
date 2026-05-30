server {
    listen 8080;
    server_name download.aethersx2apk.pro;
    return 301 https://download.aethersx2apk.pro$request_uri;
}

server {
    listen 8443 ssl;
    server_name download.aethersx2apk.pro;
    root /var/www/html;
    index index.html index.php;

    ssl_certificate /etc/letsencrypt/live/download.aethersx2apk.pro/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/download.aethersx2apk.pro/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    location / { try_files $uri $uri/ =404; }
    location ~ \.php$ { include snippets/fastcgi-php.conf; fastcgi_pass unix:/run/php/php8.3-fpm.sock; }
    location ~ /\.ht { deny all; }

    error_log /var/log/nginx/download.aethersx2apk-error.log;
    access_log /var/log/nginx/download.aethersx2apk-access.log;
}
