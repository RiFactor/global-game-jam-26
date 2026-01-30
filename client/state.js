"use strict";
import {
    AssetDeck,
    initializeCanvas,
    setCanvasSize,
    drawBackground,
} from "./canvas.js";

import { Character } from "./character.js";

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

        // This is just example code for now.
        this.characters = new Array();
    }

    // Entry point to start the game
    async start() {
        const front = this.assets.fetchImage("assets/player/front1.png");
        const back = this.assets.fetchImage("assets/player/back1.png");
        const left = this.assets.fetchImage("assets/player/left1.png");
        const right = this.assets.fetchImage("assets/player/right1.png");

        this.characters.push(
            new Character([await front, await back, await left, await right]),
        );

        setCanvasSize(this.canvas);
        console.log("Game ready");
    }

    // Drawing function. This is automatically called by
    // `requestAnimationFrame`.
    draw() {
        drawBackground(this.canvas, this.x, this.y);

        this.characters.forEach((c) => {
            c.draw(this.canvas, this.assets);
        });

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

    update(dt) {
        // game logic goes here
        this.characters.forEach((c) => {
            c.update(dt);
        });
    }
}

export { State };
