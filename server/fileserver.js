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

class CharacterState {
    player_id = "";
    x = 0;
    y = 0;
    vx = 0;
    vy = 0;
    orientation = 0;
    draw_state = 0;
    mask = 0;
    active = true;
}

class NonPlayerCharacter {
    constructor() {
        this.state = new CharacterState();
    }
}

class PlayerHandler {
    constructor(socket, player_id) {
        this.socket = socket;
        this.state = new CharacterState();
        this.state.player_id = player_id;
    }

    // Update the player state from an incoming message.
    async handleMessage(data) {
        const msg = JSON.parse(data).content;
        this.state.x = msg.x;
        this.state.y = msg.y;
        this.state.vx = msg.vx;
        this.state.vy = msg.vy;
        this.state.orientation = msg.orientation;
        this.state.draw_state = msg.draw_state;
        this.state.mask = msg.mask;
    }
}

class ServerState {
    constructor(server, websocket_server) {
        this.players = new Array();
        this.npcs = new Array();
        this.server = server;
        this.websocket_server = websocket_server;
    }

    newNPC({ x = 400, y = 300 } = {}) {
        var npc = new NonPlayerCharacter();
        npc.state.vx = (Math.random() - 0.5) * 0.1;
        npc.state.vy = (Math.random() - 0.5) * 0.1;
        this.npcs.push(npc);
    }

    async onClientConnection(socket, req) {
        const ip = req.socket.remoteAddress;
        const port = req.socket._peername.port;

        const player_id = `${ip}:${port}`;

        var player = undefined;
        for (var p of this.players) {
            if (p.state.player_id == player_id) {
                player = p;
                player.socket = socket;
                console.log(`Player reconnected: ${player_id}`);
                break;
            }
        }

        if (player === undefined) {
            player = new PlayerHandler(socket, player_id);
            this.players.push(player);
            console.log(`Websocket connected from ${ip}:${port}`);
        }

        socket.on("message", (data) => player.handleMessage(data));
        socket.on("error", console.error);
        socket.on("close", () => {
            console.log(`Player ${player_id} disconnected.`);
            player.state.active = false;
        });

        // Need to let the player known that their ID is
        socket.send(JSON.stringify({ player_id: player_id }));
    }

    updateNPCs(dt) {
        this.npcs.forEach((c) => {
            c.state.x += c.state.vx * dt;
            c.state.y += c.state.vy * dt;
        });
    }

    // Broadcast all positions to all players
    async broadcastUpdates() {
        const message = JSON.stringify({
            players: this.players.map((p) => p.state),
            characters: this.npcs.map((c) => c.state),
        });

        return this.players.map(async (player) => {
            player.socket.send(message);
        });
    }

    bind(port) {
        this.websocket_server.on("connection", (socket, req) =>
            this.onClientConnection(socket, req),
        );
        this.server.listen(port);
        console.log(`Server running at http://127.0.0.1:${PORT}/`);

        this.newNPC();

        var previous_time = Date.now();
        setInterval(async () => {
            const now = Date.now();
            this.updateNPCs(now - previous_time);
            previous_time = now;
        }, 1000 / 30); // call 30 times a second

        // triger periodically broadcasting all character states
        setInterval(async () => {
            await this.broadcastUpdates();
        }, 1000 / 10); // call 10 times a second
    }
}

const server = http.createServer(requestHandler);
const state = new ServerState(server, new ws.WebSocketServer({ server }));
state.bind(PORT);
