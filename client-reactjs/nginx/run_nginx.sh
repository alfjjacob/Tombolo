#!/bin/sh

echo "start ssh server"
#(sleep 2;/usr/sbin/sshd -D -e)
echo "started ssh server"

echo "######## Run nginx"
hostname="$1"
export HOSTNAME=$hostname
echo "## HOSTNAME ##"
echo $HOSTNAME
export DOLLAR='$'
web_exposed_port="$2"
export WEB_EXPOSED_PORT=$web_exposed_port
echo $WEB_EXPOSED_PORT
envsubst < /etc/nginx/conf.d/nginx.conf.template > /etc/nginx/conf.d/tombolo-nginx.conf
nginx -g "daemon off;"
