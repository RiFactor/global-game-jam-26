// Client-side code using websockets. no idea what i'm doing

class Connection {
    constructor(uri) {
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

        // TODO: Get the connection ID from the server (somehow)
        this.connection_id = 0;
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

    // Send the player's position to the server
    send(player) {
        if (this.ready) {
            const update = {
                player_id: this.connection_id,
                content: {
                    x_pos: player.x,
                    y_pos: player.y,
                    orientation: player.orientation,
                    moving: player.drawstate,
                    mask: player.mask,
                },
            };
            this.websocket.send(JSON.stringify(update));
        }
    }
}

export { Connection };
// when player moves, send updated position to server. send to everyone (and receive all of theirs)
// and draw all characters
