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

    // console.log(`${req.method} ${req.url} ${status_code}`);
}

class PlayerState {
    constructor(socket) {
        this.socket = socket;
        this.x = 0;
        this.y = 0;
        this.orientation = 0;
        this.draw_state = 0;
        this.mask = 0;
    }

    // Update the player state from an incoming message.
    handleMessage(data) {
        const msg = JSON.parse(data).content;
        this.x = msg.x;
        this.y = msg.y;
        this.orientation = msg.orientation;
        this.draw_state = msg.draw_state;
        this.mask = msg.mask;
    }
}

class ServerState {
    constructor(server, websocket_server) {
        this.players = new Map();
        this.server = server;
        this.websocket_server = websocket_server;
    }

    onClientConnection(socket, req) {
        const ip = req.socket.remoteAddress;
        const port = req.socket._peername.port;

        const player_id = `${ip}:${port}`;
        const player = new PlayerState(socket);
        this.players.set(player_id, player);

        console.log(`Websocket connected from ${ip}:${port}`);

        socket.on("error", console.error);
        socket.on("message", (data) => player.handleMessage(data));

        // Need to let the player known that their ID is
        socket.send(JSON.stringify({ player_id: player_id }));
    }

    bind(port) {
        this.websocket_server.on("connection", (socket, req) =>
            this.onClientConnection(socket, req),
        );
        this.server.listen(port);
        console.log(`Server running at http://127.0.0.1:${PORT}/`);
    }
}

const server = http.createServer(requestHandler);
const state = new ServerState(server, new ws.WebSocketServer({ server }));
state.bind(PORT);
