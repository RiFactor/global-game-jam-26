// This is how you import in a really basic way
import { Connection } from "./client.js";
import { URI } from "./config.js";
import { State } from "./state.js";

window.onload = () => {
    // Set up coonection to server
    const connection = new Connection(URI);

    const canvas = document.getElementById("canvas");
    var state = new State(canvas, connection);

    // Hook up the key event listener
    document.addEventListener("keyup", (e) => {
        state.onKey(e, false);
    });
    document.addEventListener("keydown", (e) => {
        state.onKey(e, true);
    });

    // Register a means for resizing the canvas
    window.addEventListener("resize", () => {
        state.onResize();
    });

    var previous_time = 0;
    function drawCallback(current_time) {
        state.draw(current_time - previous_time);
        previous_time = current_time;
        requestAnimationFrame(drawCallback);
    }

    // This is an async function so it will start whenever it feels ready
    state.start().then(() => {
        console.log("Starting draw loop");
        // Call update every 30 times a second and pass the time elapsed since
        var last_time = Date.now();
        setInterval(() => {
            const now = Date.now();
            const dt = now - last_time;
            state.update(dt);
            last_time = now;
        }, 1000 / 30);
        // Kick off the animation loop
        requestAnimationFrame(drawCallback);
    });
};
