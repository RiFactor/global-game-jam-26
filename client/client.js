// Client-side code using websockets. no idea what i'm doing

class Connection {
    constructor(uri, messageCallback) {
        this.wsUri = uri;
        this.websocket = new WebSocket(this.wsUri);
        this.ready = false;

        this.websocket.addEventListener("open", (event) => {
            this.ready = true;
        });

        // Listen fo errors and log (for now)
        this.websocket.addEventListener("error", (e) => {
            console.log(`ERROR: ${e}`);
        });

        this.websocket.addEventListener("message", (e) => {
            const message = JSON.parse(e.data);
            messageCallback(message);
        });
    }

    // Keep pinging the server
    ping() {
        this.websocket.addEventListener("open", () => {
            console.log("CONNECTED");
            var counter = 0;
            const pingInterval = setInterval(() => {
                console.log(`SENT: ping: ${counter}`);
                counter += 1;
                this.websocket.send("ping");
            }, 1000);
        });
    }

    // Tell the server that we are ready
    sendReady() {
        if (this.ready) {
            this.websocket.send(JSON.stringify({ ready: 1 }));
        }
    }

    // Send the player's position to the server
    send(player) {
        if (this.ready) {
            const update = {
                content: {
                    x: player.x,
                    y: player.y,
                    vx: player.vx,
                    vy: player.vy,
                    orientation: player.orientation,
                    draw_state: player.draw_state,
                    mask: player.mask,
                    has_mask: player.has_mask,
                    health: player.health,
                },
            };
            this.websocket.send(JSON.stringify(update));
        }
    }
}

export { Connection };
// when player moves, send updated position to server. send to everyone (and receive all of theirs)
// and draw all characters
