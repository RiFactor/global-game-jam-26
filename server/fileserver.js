const fs = require("fs");
const http = require("http");
const path = require("path");
const ws = require("ws");

const config = require("../client/config.js");
const utils = require("../client/utils.js");

const PORT = 8000;
const LEADERBOARD_FILE = "leaderboard.txt";

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
    txt: "text/ascii",
};

const STATIC_PATH = path.join(process.cwd(), "client");
const toBool = [() => true, () => false];

const Facing = require("../client/character.js").Facing;

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
    orientation = 1;
    draw_state = 1;
    mask = 0;
    active = true;
    has_mask = false;
    health = 0;
    survival_time = 0;
}

class NonPlayerCharacter {
    constructor() {
        this.state = new CharacterState();
        this.target = undefined;
        // Search radius in game units
        this.search_radius = 500;
        this.speed = 0.165;
    }

    // Look for a target player in range
    setTarget(players) {
        if (players.length < 1) {
            return;
        }

        // Iterate over players until an ACTIVE is found one in range, set them as target
        var dists = new Array();
        var min_dist = 1e20;
        var potential_target = "";
        for (var p of players) {
            // skip if wrong mask
            if (p.state.mask != this.state.mask) {
                continue;
            }

            var dist = Math.sqrt(
                Math.pow(p.state.x - this.state.x, 2) +
                    Math.pow(p.state.y - this.state.y, 2),
            );

            // Skip if distance too big or inactive
            if (dist > this.search_radius) {
                continue;
            }

            if (!p.state.active || p.state.health < 0) {
                continue;
            }

            // If dist less than min dist, switch potential target
            if (dist < min_dist) {
                min_dist = dist;
                this.target = p.state.player_id;
            }
        }
    }

    // Set new vx, vy based on relative direction of player.
    // speed is slightly faster than players default move
    updateVelocity(target) {
        const dy = target.state.y - this.state.y;
        const dx = target.state.x - this.state.x;

        if (dx == 0 && dy == 0) {
            // if both dx and dy are 0, reassign to a random number to avoid div by 0 below
            dx = Math.random() - 0.5;
            dy = Math.random() - 0.5;
        }

        const speed_fact =
            this.speed / Math.sqrt(Math.pow(dy, 2) + Math.pow(dx, 2));

        this.state.vx = dx * speed_fact;
        this.state.vy = dy * speed_fact;
    }

    // Check that the target is still valid
    checkTarget(target) {
        // Only check if actually following
        if (this.target !== undefined) {
            // Mask check
            if (target.state.mask != this.state.mask) {
                this.target = undefined;
            }

            // Active check
            if (!target.state.active || target.state.health <= 0) {
                this.target = undefined;
            }

            // If not following anyone, slow down to 50% and drift
            if (this.target == undefined) {
                this.state.vx = this.state.vx * 0.1;
                this.state.vy = this.state.vy * 0.1;
                return;
            }
        }
    }

    // Wrapper function for all the onstep updates
    onstepUpdates(players) {
        this.setTarget(players);

        if (players.length == 0) {
            return;
        }

        const target_player = players.filter(
            (p) => this.target == p.state.player_id,
        )[0];
        if (this.target !== undefined) {
            this.checkTarget(target_player);
        }

        if (this.target !== undefined) {
            this.updateVelocity(target_player);
        } else {
            // Drift in roughly the same direction as before
            this.state.vx = this.state.vx + utils.gaussianRandom(0, 0.001);
            this.state.vy = this.state.vy + utils.gaussianRandom(0, 0.001);
        }

        // Choose facing direction based on vx, vy
        const angle = Math.atan2(this.state.vx, this.state.vy);
        // up: pi, right: pi/2, down: 0, left: -pi/2,

        // Facing up
        if (Math.abs(angle) >= (3 * Math.PI) / 4) {
            this.state.orientation = Facing.UP;
        }
        // Left
        else if (-Math.PI / 4 >= angle && angle > (-3 * Math.PI) / 4) {
            this.state.orientation = Facing.LEFT;
        }
        // Down
        else if (-Math.PI / 4 < angle && angle < Math.PI / 4) {
            this.state.orientation = Facing.DOWN;
        }
        // Right
        else if (Math.PI / 4 <= angle && angle < (3 * Math.PI) / 4) {
            this.state.orientation = Facing.RIGHT;
        }
    }
}

class PlayerHandler {
    constructor(socket, player_id) {
        this.socket = socket;
        this.state = new CharacterState();
        this.state.player_id = player_id;
        this.ready = false;
    }

    // Update the player state from an incoming message.
    async handleMessage(data) {
        const msg = JSON.parse(data);
        if (msg.ready !== undefined) {
            if (msg.ready == 1) {
                console.log(`Player ${this.state.player_id} is ready`);
                this.ready = true;
            }
        }
        if (msg.death !== undefined) {
            if (msg.death == 1) {
                this.state.survival_time = msg.survival_time;
                console.log(
                    `Player ${this.state.player_id} died with time ${msg.survival_time.toFixed(2)}s`,
                );
                return {
                    type: "death",
                    player_id: this.state.player_id,
                    time: msg.survival_time,
                };
            }
        }
        if (msg.content !== undefined) {
            const content = msg.content;
            this.state.x = content.x;
            this.state.y = content.y;
            this.state.vx = content.vx;
            this.state.vy = content.vy;
            this.state.orientation = content.orientation;
            this.state.draw_state = content.draw_state;
            this.state.mask = content.mask;
            this.state.has_mask = content.has_mask;
            this.state.health = content.health;
        }
    }
}

class ServerState {
    constructor(server, websocket_server) {
        this.players = new Array();
        this.npcs = new Array();
        this.server = server;
        this.websocket_server = websocket_server;

        this.game_running = false;
        this.leaderboard = new Array();
        this.loadLeaderboard();

        this.map_width_tiles = 0;
        this.map_height_tiles = 0;

        this.spawn_frequency = config.SPAWN_FREQUENCY;
        this.spawn_increment = config.SPAWN_INCREMENT;

        // For holding onto the interval timers
        this.interval_npcs = undefined;
        this.interval_update = undefined;
        this.interval_broadcast = undefined;
    }

    newNPC() {
        var npc = new NonPlayerCharacter();
        npc.speed *= utils.gaussianRandom(1.0, 0.1);
        // TODO: bump this number when we add more masks
        npc.state.mask = utils.randomSelect([0, 1, 2]);
        npc.state.has_mask = true;

        npc.state.x =
            Math.random() * (this.map_width_tiles - 1) * config.TILE_SIZE +
            config.TILE_SIZE;
        npc.state.y =
            Math.random() * (this.map_height_tiles - 1) * config.TILE_SIZE +
            config.TILE_SIZE;
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

        socket.on("message", async (data) => {
            const result = await player.handleMessage(data);
            if (result && result.type === "death") {
                // Add to leaderboard
                this.leaderboard.push({
                    player_id: result.player_id,
                    time: result.time,
                });
                // Sort by time descending (highest time first)
                this.leaderboard.sort((a, b) => b.time - a.time);
                // Save to file
                this.saveLeaderboard();
                // Find player rank
                const playerRank =
                    this.leaderboard.findIndex(
                        (entry) =>
                            entry.player_id === result.player_id &&
                            entry.time === result.time,
                    ) + 1;
                // Broadcast updated leaderboard to all players with the dead player's rank
                this.broadcastLeaderboard(result.player_id, playerRank);
            }
        });
        socket.on("error", console.error);
        socket.on("close", () => {
            console.log(`Player ${player_id} disconnected.`);
            player.state.active = false;
        });

        // Need to let the player known that their ID is
        socket.send(JSON.stringify({ player_id: player_id }));
    }

    loadMap(filename) {
        const text = fs.readFileSync(filename, "ascii");
        this.map_matrix = utils.textToMatrix(text);
        this.map_height_tiles = this.map_matrix.length;
        if (this.map_height_tiles > 0) {
            this.map_width_tiles = this.map_matrix[0].length;
        }
    }

    loadLeaderboard() {
        try {
            if (fs.existsSync(LEADERBOARD_FILE)) {
                const data = fs.readFileSync(LEADERBOARD_FILE, "utf8");
                const lines = data.split("\n").filter((line) => line.trim());
                this.leaderboard = lines.map((line) => {
                    const [player_id, time] = line.split(",");
                    return { player_id, time: parseFloat(time) };
                });
                console.log(
                    `Loaded ${this.leaderboard.length} entries from leaderboard`,
                );
            }
        } catch (err) {
            console.error("Error loading leaderboard:", err);
            this.leaderboard = [];
        }
    }

    saveLeaderboard() {
        try {
            const data = this.leaderboard
                .map((entry) => `${entry.player_id},${entry.time}`)
                .join("\n");
            fs.writeFileSync(LEADERBOARD_FILE, data, "utf8");
            console.log("Leaderboard saved to file");
        } catch (err) {
            console.error("Error saving leaderboard:", err);
        }
    }

    allPlayersAre(predicate) {
        // wait for everyone to be ready
        var all_predicate = true;
        var some_active = false;
        for (const p of this.players) {
            if (p.state.active) {
                some_active = true;
                if (!predicate(p)) {
                    all_predicate = false;
                    break;
                }
            }
        }
        return all_predicate && some_active;
    }

    // Called as the update tick
    updateGameState(dt) {
        if (this.game_running) {
            this.updateNPCs(dt);
            // check if everyone has been got yet
            if (this.allPlayersAre((p) => p.state.health < 0)) {
                for (var p of this.players) {
                    // all players are unready
                    p.ready = false;
                }
                this.resetGame();
            }
        } else {
            // wait for everyone to be ready
            if (this.allPlayersAre((p) => p.ready)) {
                this.startGame();
            }
        }
    }

    /// Used to reset all game state
    resetGame() {
        console.log("Resetting game");
        this.game_running = false;
        // Notify all players to reset game state
        const message = JSON.stringify({
            reset_game: 1,
        });
        this.players.forEach((player) => {
            player.socket.send(message);
        });
        // Clear the NPCs interval
        clearInterval(this.interval_npcs);
        // delete all npcs, initialse new fresh ones
        this.npcs.length = 0;
        this.setInitialNPCs();
    }

    // Called once when the game starts
    startGame() {
        console.log("All players are ready. Starting game!");

        // Notify all players to set state to playing
        const message = JSON.stringify({
            start_game: 1,
        });
        this.players.forEach((player) => {
            player.socket.send(message);
        });

        // Enable all NPC animations
        this.npcs.forEach((c) => {
            c.state.draw_state = 1;
        });

        // Setup the interval to spawn new NPCs
        this.interval_npcs = setInterval(async () => {
            const spawn_amount = utils.gaussianRandom(
                this.spawn_increment,
                1 * Math.sqrt(this.spawn_increment),
            );

            for (let i = 0; i < spawn_amount; i += 1) {
                this.newNPC();
            }
        }, 1000 * this.spawn_frequency);

        this.game_running = true;
    }

    updateNPCs(dt) {
        this.npcs.forEach((c) => {
            c.onstepUpdates(this.players);
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

    // Broadcast leaderboard to all players
    async broadcastLeaderboard(deadPlayerId = null, playerRank = null) {
        const message = JSON.stringify({
            leaderboard: this.leaderboard.slice(0, 10), // Top 10
            player_rank: deadPlayerId
                ? { player_id: deadPlayerId, rank: playerRank }
                : null,
        });

        this.players.forEach((player) => {
            if (player.socket.readyState === 1) {
                player.socket.send(message);
            }
        });
    }

    setInitialNPCs() {
        // populate some number of NPCs at the begnning
        for (let i = 0; i < 48; i += 1) {
            this.newNPC();
        }
        // set them all stationary
        this.npcs.forEach((c) => (c.state.draw_state = 0));
    }

    bind(port) {
        this.websocket_server.on("connection", (socket, req) =>
            this.onClientConnection(socket, req),
        );
        this.server.listen(port);
        console.log(`Server running at http://127.0.0.1:${PORT}/`);

        this.setInitialNPCs();

        var previous_time = Date.now();
        this.interval_update = setInterval(async () => {
            const now = Date.now();
            this.updateGameState(now - previous_time);
            previous_time = now;
        }, 1000 / 30); // call 30 times a second

        // triger periodically broadcasting all character states
        this.interval_broadcast = setInterval(async () => {
            await this.broadcastUpdates();
        }, 1000 / 10); // call 10 times a second
    }
}

const server = http.createServer(requestHandler);
const state = new ServerState(server, new ws.WebSocketServer({ server }));
state.loadMap(`client${config.WORLD_MAP}`);
state.bind(PORT);
