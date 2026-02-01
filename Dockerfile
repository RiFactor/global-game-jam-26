FROM node:latest
WORKDIR /home/node/app
RUN npm install websocket ws
COPY . . 
CMD ["node", "./server/fileserver.js"]
