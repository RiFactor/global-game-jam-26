"use strict";
import {
    AssetDeck,
    initializeCanvas,
    setCanvasSize,
    drawBackground,
} from "./canvas.js";

class State {
    constructor(canvas) {
        this.x = 10;
        this.y = 10;
        // Save the passed canvas
        this._main_canvas = canvas;
        this._main_canvas.ctx = canvas.getContext("2d");
        // Set the currently active canvas
        this.canvas = this._main_canvas;
        this.assets = new AssetDeck();
    }

    // Entry point to start the game
    async start() {
        const player_index = await this.assets.fetchImage(
            "assets/player/front1.png",
        );
        setCanvasSize(this.canvas);
        console.log("Game ready");
    }

    // Drawing function. This is automatically called by
    // `requestAnimationFrame`.
    draw() {
        drawBackground(this.canvas, this.x, this.y);
        this.canvas.ctx.drawImage(
            this.assets.getSprite(0),
            this.x,
            this.y,
            100,
            100,
        );
    }

    // This triggers as a callback.
    onKey(e) {
        switch (e.key) {
            case "d":
                this.x += 10;
                break;
            case "a":
                this.x -= 10;
                break;
            case "w":
                this.y -= 10;
                break;
            case "s":
                this.y += 10;
                break;
            default:
                console.log(e.key);
        }
    }

    // Called whenever the window is resized.
    onResize() {
        setCanvasSize(this.canvas);
        updateCanvas(this.canvas, 0, 0);
    }

    update() {
        // game logic goes here
    }
}

export { State };
