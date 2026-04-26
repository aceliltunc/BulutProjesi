#!/bin/sh
set -e
UPSTREAM="${API_UPSTREAM:-http://api:8080}"
sed "s|__API_UPSTREAM__|${UPSTREAM}|g" /opt/nginx.app.conf > /etc/nginx/conf.d/default.conf
exec nginx -g "daemon off;"
