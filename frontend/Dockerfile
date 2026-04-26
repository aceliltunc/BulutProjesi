FROM node:22-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
# Uretim imaji: VITE tanimi yok; bos base + nginx reverse proxy (tek public URL)
# Ayri FQDN ile API: docker build --build-arg VITE_API_BASE_URL=https://api....
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

FROM nginx:1.27-alpine AS runtime
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.app.conf /opt/nginx.app.conf
COPY docker-entrypoint-nginx.sh /docker-entrypoint-nginx.sh
RUN sed -i 's/\r$//' /docker-entrypoint-nginx.sh && chmod +x /docker-entrypoint-nginx.sh

EXPOSE 80
ENV API_UPSTREAM=http://api:8080
ENTRYPOINT ["/docker-entrypoint-nginx.sh"]
