"use strict";
import { AssetDeck, onResize, GameMap, ViewPort, HUD } from "./canvas.js";

import * as config from "./config.js";
import {
    Character,
    Facing,
    loadPlayerSprites,
    loadAllMaskSprites,
} from "./character.js";

import { Connection } from "./client.js";

const GameState = Object.freeze({
    PLAYING: 0,
    GAME_OVER: 1,
});

class State {
    constructor(canvas, connection) {
        this.x = 10;
        this.y = 10;
        this.vx = 0;
        this.vy = 0;
        this.orientation = 0;
        this.mask = 0;
        // Save the passed canvas
        this._main_canvas = canvas;
        this._main_canvas.ctx = canvas.getContext("2d");
        // Set the currently active canvas
        this.canvas = this._main_canvas;
        this.assets = new AssetDeck();

        this.game_state = GameState.PLAYING;

        // This is just example code for now.
        this.characters = new Array();
        this.other_players = new Array();
        // The player controlled character
        this.player = null;

        this.game_map = new GameMap();
        this.hud = new HUD();

        // This controls where on the map we are drawing things
        this.viewport = new ViewPort(this.canvas);

        // Associate the connection to the server
        this.conn = undefined;
        // This is set by the server
        this.player_id = undefined;

        // To fix all the movement problems, store the key states and then work
        // out the movement vectors during update.
        this.key_up = false;
        this.key_down = false;
        this.key_left = false;
        this.key_right = false;

        // Functions for creating a new character and new player
        this.addPlayer = undefined;
        this.addCharacter = undefined;
    }

    // Entry point to start the game
    async start() {
        const asset_promises = [
            loadPlayerSprites(this.assets),
            loadAllMaskSprites(this.assets),
            loadAllMaskSprites(this.assets, {
                character: "enemy",
            }),
        ];
        config.MASK_CONFIG.forEach((conf) => {
            asset_promises.push(
                loadPlayerSprites(this.assets, {
                    character: "enemy",
                    tint_key: conf[0],
                }),
            );
        });
        const all_assets = await Promise.all(asset_promises);
        const character_sprites = all_assets[0];
        const character_masks = all_assets[1];
        const enemy_masks = all_assets[2];

        const map_index = await this.assets.fetchFile(
            "/assets/maps/asscii-map1.txt",
        );
        // set and load the game map
        this.game_map.setMap(this.assets.file_buffer[map_index]);

        this.addCharacter = (character) => {
            this.characters.push(
                new Character(all_assets[3 + character.mask], enemy_masks),
            );
        };

        this.addPlayer = async (character) => {
            let player_assets = await Promise.all([
                loadPlayerSprites(this.assets, {
                    tint_key: character.player_id,
                }),
                loadAllMaskSprites(this.assets, {
                    tint_key: character.player_id,
                }),
            ]);
            this.other_players.push(
                new Character(
                    player_assets[0],
                    character_masks,
                    player_assets[1],
                ),
            );
        };

        this.player = new Character(character_sprites, character_masks);
        // This is just a placeholder calculation to center the player in the viewport
        this.player.x = this.viewport.width / 2 - 50;
        this.player.y = this.viewport.height / 2 - 50;

        onResize(this.canvas);

        this.conn = new Connection(config.URI, (msg) =>
            this.onServerMessage(msg),
        );

        console.log("Game ready");
    }

    onServerMessage(message) {
        // Get the player ID
        if (message.player_id !== undefined) {
            console.log(`Player ID set to ${message.player_id}`);
            this.player_id = message.player_id;
            this.player.player_id = message.player_id;
            return;
        }

        // Update the characters (enemies)
        if (message.characters !== undefined) {
            var n_char = this.characters.length;
            let curr_characters_length = this.characters.length;
            let new_characters =
                message.characters.length - curr_characters_length;

            if (new_characters < 0) {
                console.error("Missing characters");
            } else if (new_characters > 0) {
                for (let i = 0; i < new_characters; i++) {
                    this.addCharacter(
                        message.characters[curr_characters_length + i],
                    );
                }
            }

            // Update positions of characters on receipt of message
            for (let i = 0; i < n_char; i++) {
                this.characters[i].setState(message.characters[i]);
            }
        }

        // Update the players (also enemies, but human controlled)
        if (message.players !== undefined) {
            message.players = message.players.filter(
                (p) => p.player_id != this.player_id,
            );
            var n_players = this.other_players.length;
            let new_players = message.players.length - n_players;

            if (new_players < 0) {
                console.error("Missing players");
            } else if (new_players > 0) {
                for (let i = 0; i < new_players; i++) {
                    this.addPlayer(message.players[n_players + i]);
                }
            }

            // Update positions of characters on receipt of message
            for (let i = 0; i < n_players; i++) {
                this.other_players[i].setState(message.players[i]);
            }
        }
    }

    // Drawing function. This is automatically called by
    // `requestAnimationFrame`.
    draw(dt) {
        this.game_map.draw(dt, this.viewport, this.assets);

        this.player.draw(dt, this.viewport, this.assets);
        this.other_players.forEach((c) => {
            if (c.active) {
                c.draw(dt, this.viewport, this.assets);
            }
        });
        this.characters.forEach((c) => {
            c.draw(dt, this.viewport, this.assets);
        });
        this.hud.draw(
            dt,
            this.viewport,
            this.assets,
            this.player,
            this.other_players,
            this.game_map,
        );

        if (this.game_state == GameState.GAME_OVER) {
            this.drawGameOver();
        }
    }

    // This triggers as a callback.
    onKey(e, active) {
        if (this.game_state == GameState.GAME_OVER) {
            this.key_right = false;
            this.key_up = false;
            this.key_down = false;
            this.key_left = false;
            return;
        }
        switch (e.key) {
            case "d":
            case "D":
                this.key_right = active;
                if (active) {
                    this.player.orientation = Facing.RIGHT;
                }
                break;
            case "a":
            case "A":
                this.key_left = active;
                if (active) {
                    this.player.orientation = Facing.LEFT;
                }
                break;
            case "w":
            case "W":
                this.key_up = active;
                if (active) {
                    this.player.orientation = Facing.UP;
                }
                break;
            case "s":
            case "S":
                this.key_down = active;
                if (active) {
                    this.player.orientation = Facing.DOWN;
                }
                break;
            case "e":
            case "E":
                if (active) {
                    this.player.nextMask();
                }
                break;
            case "q":
            case "Q":
                if (active) {
                    this.player.prevMask();
                }
                break;
            default:
                console.log(e.key);
        }
    }

    // Called whenever the window is resized.
    onResize() {
        onResize(this.canvas);
    }

    update(dt) {
        if (this.game_state == GameState.GAME_OVER) {
            return;
        }
        this.player.updateKeys(
            this.key_up,
            this.key_down,
            this.key_left,
            this.key_right,
        );

        // check collisions with geometry
        this.game_map.collide(this.player);

        this.characters.forEach((c) => {
            c.update(dt);
            const collide = c.collision_box.collide(
                c.x,
                c.y,
                this.player.collision_box,
                this.player.x,
                this.player.y,
            );
            if (collide !== null) {
                if (this.player.mask == c.mask) {
                    this.player.health -= config.DAMAGE_RATE * dt;
                    console.log(this.player.health);
                    if (this.player.health < 0) {
                        this.gameOver();
                    }
                }
            }
        });

        this.player.update(dt);

        // Update other players
        this.other_players.forEach((p) => {
            p.update(dt);
        });

        this.viewport.follow(
            dt,
            this.player.x,
            this.player.y,
            this.player.vx,
            this.player.vy,
        );

        // After updating the movement, send updated position to server
        this.conn.send(this.player);
    }

    drawGameOver() {
        const drawText = (color, offset) => {
            this.canvas.ctx.fillStyle = color;
            this.canvas.ctx.font = "bold 80px Consolas";
            this.canvas.ctx.fillText(
                "Htey fuond oyu",
                100 + offset,
                200 + offset,
            );
            this.canvas.ctx.strokeStyle = "black";
            this.canvas.ctx.strokeText(
                "Htey fuond oyu",
                100 + offset,
                200 + offset,
            );
        };
        drawText("black", 15);
        drawText("red", 10);
        drawText("black", 5);
        drawText("red", 0);

        const currentMask = this.assets.getSprite(
            this.player.mask_frames[this.mask][1],
        );
        this.canvas.ctx.drawImage(
            currentMask,
            this.canvas.width / 2 - 144,
            this.canvas.height / 2,
            288,
            288,
        );
    }

    gameOver() {
        this.game_state = GameState.GAME_OVER;
        // notify the server
    }
}

export { State };
