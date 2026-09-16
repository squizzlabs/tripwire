FROM node:24-alpine

WORKDIR /opt/cron

COPY cron/package.json cron/package-lock.json ./
RUN npm ci --omit=dev

COPY cron/src ./src
COPY public/js/combine.js /opt/public/js/combine.js

USER node

CMD ["npm", "start"]
