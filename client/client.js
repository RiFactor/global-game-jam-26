// Client-side code using websockets. no idea what i'm doing

window.onload = () => {
    const wsUri = "ws://127.0.0.1/";
    const websocket = new WebSocket(wsUri);

    websocket.addEventListener("open", () => {
        log("CONNECTED");
        pingInterval = setInterval(() => {
            log(`SENT: ping: ${counter}`);
            websocket.send("ping");
        }, 1000)
    })
}