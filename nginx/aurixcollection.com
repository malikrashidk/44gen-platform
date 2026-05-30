server {
    listen 8080;
    server_name aurixcollection.com www.aurixcollection.com;
    return 301 https://aurixcollection.com$request_uri;
}

server {
    listen 8443 ssl;
    server_name www.aurixcollection.com;
    ssl_certificate /etc/letsencrypt/live/aurixcollection.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/aurixcollection.com/privkey.pem;
    return 301 https://aurixcollection.com$request_uri;
}

server {
    listen 8443 ssl;
    server_name aurixcollection.com;
    root /var/www/html;
    index index.html index.php;

    ssl_certificate /etc/letsencrypt/live/aurixcollection.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/aurixcollection.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    location / { try_files $uri $uri/ =404; }
    location ~ \.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/run/php/php8.3-fpm.sock;
    }
    location ~ /\.ht { deny all; }

    error_log /var/log/nginx/aurixcollection-error.log;
    access_log /var/log/nginx/aurixcollection-access.log;
}
