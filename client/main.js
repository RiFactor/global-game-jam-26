// This is how you import in a really basic way
import { State } from "./state.js";
import {
    isMobile,
    addDpadToScreen,
    addActionsButtonsToScreen,
} from "./mobile.js";

window.onload = () => {
    document.addEventListener("dblclick", function (e) {
        e.preventDefault();
    });

    const mobile = isMobile();
    console.log(mobile);

    // Set up coonection to server
    const canvas = document.getElementById("canvas");
    var state = new State(canvas);

    if (isMobile()) {
        const canvas = document.getElementById("canvas");
        // Example: make canvas fill most of the viewport
        canvas.style.width = "98vw";
        canvas.style.height = "40vh";
        canvas.width = window.innerWidth * 0.98;
        canvas.height = window.innerHeight * 0.3;

        addDpadToScreen(state);
        addActionsButtonsToScreen(state);
    }

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
