// This is how you import in a really basic way
import {initializeCanvas, setCanvasSize, updateCanvas} from './canvas.js'

class State {
    constructor() {
        this.x = 0;
        this.y = 0;
    }
};

window.addEventListener('resize', () => {
    console.log("Window resized");
    canvas = document.getElementById("canvas");
    setCanvasSize(canvas);
    updateCanvas(canvas, 0, 0);
});

window.onload = () => {
    const canvas = document.getElementById("canvas");
    const ctx = canvas.getContext("2d");

    initializeCanvas(canvas);
    var state = new State();

    document.addEventListener("keypress", (e) => {
        switch (e.key) {
            case 'w':
                state.y += 50;
                break;
            case 'd':
                self.y -= 50;
                break;
            case 's':
                state.x += 50;
                break;
            case 'a':
                state.x -= 50;
                break;
            default:
                console.log(e.key);
        }
    });
    updateCanvas(canvas, state.x, state.y);
};

// dumb game loop for testing
setInterval(() => {
    const canvas = document.getElementById("canvas");
    var state = new State();
    updateCanvas(canvas, state.x, state.y);
}, 1000 / 30); // 30 FPS
