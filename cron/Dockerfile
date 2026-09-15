FROM node:24-alpine

WORKDIR /opt/cron

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src ./src

USER node

CMD ["npm", "start"]
