// This is how you import in a really basic way
import { State } from "./state.js";

window.onload = () => {
    const canvas = document.getElementById("canvas");
    var state = new State(canvas);

    // Hook up the key event listener
    document.addEventListener("keypress", (e) => {
        state.onKey(e);
    });
    // Register a means for resizing the canvas
    window.addEventListener("resize", () => {
        state.onResize();
    });

    function drawCallback() {
        state.draw();
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
