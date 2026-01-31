FROM node:latest
WORKDIR /home/node/app
COPY . .
RUN npm install websocket ws
CMD ["node", "./server/fileserver.js"]