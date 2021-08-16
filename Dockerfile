FROM node:14.15-buster-slim

WORKDIR /usr/src/app

COPY package.json .
COPY package-lock.json .

RUN npm ci

COPY . .

CMD ["npm", "start"]
