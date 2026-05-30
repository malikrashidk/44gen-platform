server {
    listen 8080;
    server_name my.44gen.com;
    return 301 https://my.44gen.com$request_uri;
}

server {
    listen 8443 ssl;
    server_name my.44gen.com;
    root /var/www/my.44gen.com/public;
    index index.php index.html;

    ssl_certificate /etc/letsencrypt/live/my.44gen.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/my.44gen.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    location / { try_files $uri $uri/ /index.php?$query_string; }
    location ~ \.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/run/php/php8.3-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    location ~ /\.ht { deny all; }

    error_log /var/log/nginx/my.44gen.com-error.log;
    access_log /var/log/nginx/my.44gen.com-access.log;
}
