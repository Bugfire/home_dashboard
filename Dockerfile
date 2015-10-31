FROM node:0.12.7

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY package.json /usr/src/app/
RUN npm install

COPY home_dashboard.js run.sh res/* /usr/src/app/

VOLUME ["/data"]

EXPOSE 3000

CMD [ "./run.sh" ]
