const fs = require("fs");
const http = require("http");
const path = require("path");
const ws = require("ws");

const PORT = 8000;

const MIME_TYPES = {
    default: "application/octet-stream",
    html: "text/html; charset=UTF-8",
    js: "text/javascript",
    css: "text/css",
    png: "image/png",
    jpg: "image/jpeg",
    gif: "image/gif",
    ico: "image/x-icon",
    svg: "image/svg+xml",
};

const STATIC_PATH = path.join(process.cwd(), "client");
const toBool = [() => true, () => false];

// Translates a url path to a file name.
function lookupPath(url_path) {
    if (url_path == "/") return "index.html";
    return url_path;
}

async function requestHandler(req, res) {
    if (req.url == "/ws") return; // it's already been upgraded

    const file_path = path.join(STATIC_PATH, lookupPath(req.url));
    console.log(file_path);
    const file_exists = await fs.promises.access(file_path).then(...toBool);

    var status_code = 200;
    if (file_exists) {
        const ext = path.extname(file_path).substring(1).toLowerCase();
        const stream = fs.createReadStream(file_path);
        const mimeType = MIME_TYPES[ext] || MIME_TYPES.default;
        res.writeHead(status_code, { "Content-Type": mimeType });
        stream.pipe(res);
    } else {
        status_code = 404;
        res.writeHead(status_code);
        res.end("Not found\n");
    }

    console.log(`${req.method} ${req.url} ${status_code}`);
}

const server = http.createServer(requestHandler);

const wss = new ws.WebSocketServer({ server });

const players = {};

  let currentId = 0;


wss.on("connection", function connection(ws) {
    console.log("Websocket connected");
    ws.on("error", console.error);

    ws.on("message", function message(data) {
      console.log("received: %s", data);
      const update = JSON.parse(data);
      players[update.player_id] = update.content;
      broadcastExcept(ws, {
        message: "player_udpate",
        player_id: update.player_id,
        content: update.content
      })
    });
    

  player.Id = currentId;

    ws.send(JSON.stringify({message: "Welcome, traveler.", player_id: player.Id} ));
    ws.send(JSON.stringify({message: "other players"}, players))

    currentId + 1;

    
});

server.listen(PORT);
console.log(`Server running at http://127.0.0.1:${PORT}/`);
