FROM nginx
ADD 40-env-update.sh /docker-entrypoint.d
RUN chmod +x /docker-entrypoint.d/40-env-update.sh
COPY . /usr/share/nginx/html

