FROM node:latest
WORKDIR /home/node/app
RUN npm install websocket ws
CMD ["node", "./server/fileserver.js"]