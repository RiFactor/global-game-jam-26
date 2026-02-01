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
        const all_assets = await Promise.all([
            loadPlayerSprites(this.assets),
            loadPlayerSprites(this.assets, {
                character: "enemy",
                tint_key: "arlecchino",
            }),
            loadAllMaskSprites(this.assets),
            loadAllMaskSprites(this.assets, {
                character: "enemy",
                mask_name: "arlecchino",
            }),
        ]);
        const character_sprites = all_assets[0];
        const enemy_sprites = all_assets[1];
        const character_masks = all_assets[2];
        const enemy_masks = all_assets[3];

        const map_index = await this.assets.fetchFile(
            "/assets/maps/asscii-map1.txt",
        );
        // set and load the game map
        this.game_map.setMap(this.assets.file_buffer[map_index]);

        this.addCharacter = () => {
            this.characters.push(new Character(enemy_sprites, enemy_masks));
        };

        this.addPlayer = () => {
            this.other_players.push(
                new Character(character_sprites, character_masks),
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
            let new_characters =
                message.characters.length - this.characters.length;

            if (new_characters < 0) {
                console.error("Missing characters");
            } else if (new_characters > 0) {
                for (let i = 0; i < new_characters; i++) {
                    this.addCharacter();
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
            let new_players =
                message.players.length - this.other_players.length;

            if (new_players < 0) {
                console.error("Missing players");
            } else if (new_players > 0) {
                for (let i = 0; i < new_players; i++) {
                    this.addPlayer();
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
    }

    // This triggers as a callback.
    onKey(e, active) {
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
                console.log("Hello World");
            }
        });

        this.player.update(dt);

        // Update other players
        this.other_players.forEach((p) => {
            p.update(dt);
        })

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
}

export { State };
