FROM node:14.9.0-alpine as build

WORKDIR /app

COPY package*.json /app/

RUN npm install

COPY . /app/

RUN npm run build

#temperory fix for hpcc-js lib causing CSP to fail
RUN sed -i 's/new Function("return this;")()/function(){return this;}/g' build/static/js/*.chunk.js

FROM nginx:1.19.8-alpine

COPY --from=build /app/build /usr/share/nginx/html

RUN rm /etc/nginx/conf.d/default.conf

COPY nginx/nginx.conf /etc/nginx/nginx.conf

COPY nginx/conf.d/nginx.conf.template /etc/nginx/conf.d/nginx.conf.template

COPY nginx/run_nginx.sh /etc/nginx/run_nginx.sh

RUN dos2unix /etc/nginx/run_nginx.sh

# Install OpenSSH and set the password for root to "Docker!". In this example, "apk add" is the install instruction for an Alpine Linux-based image.
RUN apk add openssh \
     && echo "root:Docker!" | chpasswd 

# Copy the sshd_config file to the /etc/ssh/ directory
COPY sshd_config /etc/ssh/

# Copy and configure the ssh_setup file
RUN mkdir -p /tmp
COPY ssh_setup.sh /tmp/
RUN dos2unix /tmp/ssh_setup.sh
RUN chmod +x /tmp/ssh_setup.sh \
    && (sleep 1;/tmp/ssh_setup.sh 2>&1 > /dev/null)

# Open port 2222 for SSH access
EXPOSE 80 2222

RUN ["chmod", "+x", "/etc/nginx/run_nginx.sh"]