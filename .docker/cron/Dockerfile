FROM node:24-alpine

WORKDIR /opt/cron

COPY cron/package.json cron/package-lock.json ./
RUN npm ci --omit=dev

COPY cron/src ./src

USER node

CMD ["npm", "start"]
