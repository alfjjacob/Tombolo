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
envsubst < /etc/nginx/conf.d/nginx.conf.template > /etc/nginx/conf.d/tombolo-nginx.conf
nginx -g "daemon off;"
