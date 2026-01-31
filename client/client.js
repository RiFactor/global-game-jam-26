// Client-side code using websockets. no idea what i'm doing

window.onload = () => {
    const wsUri = "ws://127.0.0.1:8000/";
    const websocket = new WebSocket(wsUri);

    websocket.addEventListener("open", () => {
        console.log("CONNECTED");
        var counter = 0
        const pingInterval = setInterval(() => {
            console.log(`SENT: ping: ${counter}`);
            counter += 1
            websocket.send("ping");
        }, 1000)
    })
}

// when player moves, send updated position to server. send to everyone (and receive all of theirs) 
// and draw all characters