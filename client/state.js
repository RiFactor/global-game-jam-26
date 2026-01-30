"use strict";
import {
    AssetDeck,
    initializeCanvas,
    setCanvasSize,
    drawBackground,
} from "./canvas.js";

import * as config from "./config.js";
import { Character } from "./character.js";

class State {
    constructor(canvas) {
        this.x = 10;
        this.y = 10;
        this.vx = 0;
        this.vy = 0;
        this.orientation = 0;
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
            this.assets.getSprite(this.orientation),
            this.x,
            this.y,
            100,
            100,
        );
    }

    // This triggers as a callback.
    onKey(e, active) {
        var new_velocity = 0;
        if (active) {
            new_velocity = config.FAST;
        }

        switch (e.key) {
            case "d":
                this.vx = new_velocity;
                this.orientation = 3;
                break;
            case "a":
                this.vx = -new_velocity;
                this.orientation = 2;
                break;
            case "w":
                this.vy = -new_velocity;
                this.orientation = 1;
                break;
            case "s":
                this.vy = new_velocity;
                this.orientation = 0;
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

        this.x += this.vx * dt;
        this.y += this.vy * dt;
    }
}

export { State };
