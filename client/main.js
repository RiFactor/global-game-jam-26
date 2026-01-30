// This is how you import in a really basic way
import {initializeCanvas, setCanvasSize, updateCanvas} from './canvas.js'

class State {
    constructor() {
        this.x = 0;
        this.y = 0;
    }
};

window.onload = () => {
    const canvas = document.getElementById("canvas");
    const ctx = canvas.getContext("2d");

    initializeCanvas(canvas);
    var state = new State();

    document.addEventListener("keypress", (e) => {

        const stepSize = 50; // how much the player moves per keypress
        // sprite is 100x100, so prevent moving offscreen
        
        switch (e.key) {
            case 'w':
                if (state.y <= 0) { 
                    break
                }
                state.y -= stepSize;
                break;
            case 'a':
                if (state.x <= 0) {
                    break;
                }
                state.x -= stepSize;
                break;
            case 's':
                if (state.y >= window.innerHeight - 150) {
                    break;
                }
                state.y += stepSize;
                break;
            case 'd':
                if (state.x >= window.innerWidth - 150) {
                    break;
                }
                state.x += stepSize;
                break;

            default:
                console.log(e.key);
        }
    });
    updateCanvas(canvas, state.x, state.y);


    // dumb game loop for testing
    setInterval(() => {
        const canvas = document.getElementById("canvas");
        setCanvasSize(canvas);
        updateCanvas(canvas, state.x, state.y);
    }, 1000 / 30); // 30 FPS
};