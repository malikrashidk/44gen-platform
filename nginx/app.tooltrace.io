server {
    listen 8080;
    server_name app.tooltrace.io;
    return 301 https://app.tooltrace.io$request_uri;
}

server {
    listen 8443 ssl;
    server_name app.tooltrace.io;

    ssl_certificate /etc/letsencrypt/live/app.tooltrace.io/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.tooltrace.io/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Forwarded-Port 443;
        proxy_cache_bypass $http_upgrade;
    }

    error_log /var/log/nginx/app.tooltrace-error.log;
    access_log /var/log/nginx/app.tooltrace-access.log;
}
