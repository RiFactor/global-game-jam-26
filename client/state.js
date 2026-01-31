"use strict";
import { AssetDeck, onResize, GameMap, ViewPort } from "./canvas.js";

import * as config from "./config.js";
import {
    Character,
    Facing,
    loadPlayerSprites,
    loadAllMaskSprites,
} from "./character.js";

class State {
    constructor(canvas, connection) {
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
        // The player controlled character
        this.player = null;

        this.game_map = new GameMap();

        // This controls where on the map we are drawing things
        this.viewport = new ViewPort(this.canvas);

        // Associate the connection to the server
        this.conn = connection;
    }

    // Entry point to start the game
    async start() {
        const character_sprites = await loadPlayerSprites(this.assets);
        const enemy_sprites = await loadPlayerSprites(this.assets, {
            character: "enemy",
            tint_key: "arlecchino",
        });
        const character_masks = await loadAllMaskSprites(this.assets);
        const enemy_masks = await loadAllMaskSprites(this.assets, {
            character: "enemy",
        });

        this.characters.push(new Character(enemy_sprites, enemy_masks));

        this.player = new Character(character_sprites, character_masks);
        // This is just a placeholder calculation to center the player in the viewport
        this.player.x = this.viewport.width / 2 - 50;
        this.player.y = this.viewport.height / 2 - 50;

        onResize(this.canvas);
        console.log("Game ready");
    }

    // Drawing function. This is automatically called by
    // `requestAnimationFrame`.
    draw(dt) {
        this.viewport.follow(
            dt,
            this.player.x,
            this.player.y,
            this.player.speed,
        );
        this.game_map.draw(dt, this.canvas);
        this.player.draw(dt, this.viewport, this.assets);
        this.characters.forEach((c) => {
            c.draw(dt, this.viewport, this.assets);
        });
    }

    // This triggers as a callback.
    onKey(e, active) {
        const updateMovement = (facing) => {
            if (active) {
                this.player.startMove(facing);
            } else {
                this.player.stopMove(facing);
            }
        };

        switch (e.key) {
            case "d":
                updateMovement(Facing.RIGHT);
                break;
            case "a":
                updateMovement(Facing.LEFT);
                break;
            case "w":
                updateMovement(Facing.UP);
                break;
            case "s":
                updateMovement(Facing.DOWN);
                break;
            default:
                console.log(e.key);
        }

        // After updating the movement, send updated position to server
        this.conn.send(this.player);
    }

    // Called whenever the window is resized.
    onResize() {
        onResize(this.canvas);
    }

    update(dt) {
        // game logic goes here
        this.characters.forEach((c) => {
            c.update(dt);
        });
        this.player.update(dt);
    }
}

export { State };
