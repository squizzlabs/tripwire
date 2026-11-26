FROM node:24-alpine

WORKDIR /opt/cron

COPY cron/package.json cron/package-lock.json ./
RUN npm ci --omit=dev

COPY cron/src ./src
COPY public/js/combine.js public/js/bookmark-destinations.js /opt/public/js/
COPY tools/signature-connections.json /opt/tools/signature-connections.json

USER node

CMD ["npm", "start"]
