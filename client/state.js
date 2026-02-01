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
    // During the game
    PLAYING: 0,
    // When the game ends
    GAME_OVER: 1,
    // Before the game starts
    LOBBY: 2,
    // Ready to start
    READY: 3,
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

        this.game_state = GameState.LOBBY;

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

        // Rudimentary: used to display messages temporarily on the screen
        this.show_message = 0;
        this.message = "";

        // Survival timer - tracks how long the player survived
        this.gameStartTime = null;
        this.survivalTime = 0;

        // Leaderboard data from server
        this.leaderboard = [];
        this.playerRank = null;

        // Spectator mode - for late-joining players
        this.isSpectating = false;

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

        const map_index = await this.assets.fetchFile("/map");
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
                    true,
                ),
            );
        };

        this.player = new Character(
            character_sprites,
            character_masks,
            character_masks,
            true,
        );
        // This is just a placeholder calculation to center the player in the viewport
        this.conn = new Connection(config.URI, (msg) =>
            this.onServerMessage(msg),
        );

        this.resetState();

        // Load game music (optional - game will work without it)
        try {
            const music_index = await this.assets.fetchAudio(
                "/assets/music/game-zone-320262.mp3",
            );
            this.gameMusic = this.assets.getAudio(music_index);
            this.gameMusic.loop = true;
            this.gameMusic.volume = 0.5;
        } catch (e) {
            console.log("Game music not found, continuing without it");
            this.gameMusic = null;
        }

        // Start the server synchronisation loop
        setInterval(() => {
            this.syncServer();
        }, 1000 / 10);

        console.log("Game ready");
    }

    // Called when a websocket message comes back from the server
    async onServerMessage(message) {
        // Leaderboard update
        if (message.leaderboard !== undefined) {
            console.log(
                "Leaderboard updated:",
                message.leaderboard.length,
                "entries",
            );
            this.leaderboard = message.leaderboard;
            // Update player rank from server if provided
            if (
                message.player_rank &&
                message.player_rank.player_id === this.player_id
            ) {
                this.playerRank = message.player_rank.rank;
            }
            // Recalculate rank if player is already dead and in the leaderboard
            if (this.game_state === GameState.GAME_OVER && this.player_id) {
                const foundIndex = this.leaderboard.findIndex(
                    (entry) => entry.player_id === this.player_id,
                );
                if (foundIndex !== -1) {
                    this.playerRank = foundIndex + 1;
                }
            }
            return;
        }

        // Game started?
        if (message.start_game !== undefined && message.start_game == 1) {
            this.show_message = config.SHOW_MESSAGE_TIMER;
            this.message = "Hdie!";
            this.isSpectating = false;
            this.game_state = GameState.PLAYING;
            // Start the survival timer when the game actually begins
            this.gameStartTime = Date.now();
            // Play the game music
            if (this.gameMusic) {
                this.gameMusic
                    .play()
                    .catch((e) => console.log("Audio play failed:", e));
            }
            return;
        }

        if (message.reset_game !== undefined && message.reset_game == 1) {
            // TODO: this may need to be fixed for the leaderboard?
            const delay = (ms) => new Promise((res) => setTimeout(res, ms));
            await delay(config.RESET_TIME);
            this.resetState();
            return;
        }

        // Get the player ID
        if (message.player_id !== undefined) {
            console.log(`Player ID set to ${message.player_id}`);
            this.player_id = message.player_id;
            this.player.player_id = message.player_id;

            // Check if game is already running (spectator mode)
            if (message.game_running) {
                this.isSpectating = true;
                this.player.health = -1;
                this.game_state = GameState.GAME_OVER;
                console.log("Joining as spectator - game already in progress");
            }
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

    resetState() {
        console.log("Resetting state");
        this.characters.length = 0;
        this.other_players.length = 0;
        this.game_state = GameState.LOBBY;
        this.player.health = 100;
        this.player.x = this.viewport.width / 2 - 50;
        this.player.y = this.viewport.height / 2 - 50;
        this.viewport.x = 0;
        this.viewport.y = 0;
        onResize(this.canvas);
        this.player.has_mask = false;
    }

    writeMessage(text, x, y) {
        this.canvas.ctx.fillStyle = "green";
        this.canvas.ctx.font = "bold 42px Consolas";
        this.canvas.ctx.fillText(text, x, y);
        this.canvas.ctx.strokeStyle = "black";
        this.canvas.ctx.strokeText(text, x, y);
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

        if (this.game_state == GameState.LOBBY) {
            this.writeMessage("Rpess `e` or `q` to waer mask", 100, 200);
            // Before the game starts, don't draw a HUD.
            return;
        }

        this.hud.draw(
            dt,
            this.viewport,
            this.assets,
            this.player,
            this.other_players,
            this.game_map,
            this.gameStartTime,
            this.survivalTime,
            this.game_state === GameState.GAME_OVER,
        );

        if (this.show_message > 0) {
            this.show_message -= dt;
            this.writeMessage(this.message, 100, 200);
        }

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
                if (this.game_state == GameState.LOBBY) {
                    this.setPlayerReady();
                } else if (active) {
                    this.player.nextMask();
                }
                break;
            case "q":
            case "Q":
                if (this.game_state == GameState.LOBBY) {
                    this.setPlayerReady();
                } else if (active) {
                    this.player.prevMask();
                }
                break;
            default:
                console.log(e.key);
        }
    }

    setPlayerReady() {
        this.player.has_mask = true;
        this.game_state = GameState.READY;
        // notify the server that we are ready
        this.conn.sendReady();
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

        if (this.game_state == GameState.PLAYING) {
            // Work out player-npc collisions
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
                        if (this.player.health < 0) {
                            this.gameOver();
                        }
                    }
                }
            });
        }

        this.player.update(dt);

        // Update other players
        this.other_players.forEach((p) => {
            p.update(dt);
        });

        this.viewport.follow(
            dt,
            this.game_map,
            this.player.x,
            this.player.y,
            this.player.vx,
            this.player.vy,
        );
    }

    // Send updates to the server
    syncServer() {
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

        const drawTime = (color, offset) => {
            this.canvas.ctx.fillStyle = color;
            this.canvas.ctx.font = "bold 40px Consolas";
            this.canvas.ctx.fillText(
                `Yuo vursived fro ${this.survivalTime.toFixed(2)} seconds`,
                90 + offset,
                300 + offset,
            );
            this.canvas.ctx.strokeStyle = "black";
            this.canvas.ctx.strokeText(
                `Yuo vursived fro ${this.survivalTime.toFixed(2)} seconds`,
                90 + offset,
                300 + offset,
            );
        };

        drawText("black", 15);
        drawText("red", 10);
        drawText("black", 5);
        drawText("red", 0);

        drawTime("black", 15);
        drawTime("white", 10);

        // Display player's rank underneath the time
        if (this.playerRank) {
            this.canvas.ctx.fillStyle = "black";
            this.canvas.ctx.font = "bold 30px Consolas";
            this.canvas.ctx.fillText(
                `Yo'uer rnak: #${this.playerRank}`,
                102,
                352,
            );
            this.canvas.ctx.fillStyle = "yellow";
            this.canvas.ctx.fillText(
                `Yo'uer rnak: #${this.playerRank}`,
                100,
                350,
            );
        }

        const currentMask = this.assets.getSprite(
            this.player.mask_frames[this.player.mask][1],
        );
        this.canvas.ctx.drawImage(
            currentMask,
            this.canvas.width / 2 - 144,
            this.canvas.height / 2,
            288,
            288,
        );

        // Display leaderboard
        if (this.leaderboard.length > 0) {
            this.canvas.ctx.font = "20px Consolas";
            this.leaderboard.forEach((entry, index) => {
                const rank = index + 1;
                const text = `${rank}. ${entry.player_id}: ${entry.time.toFixed(2)}s`;

                // Highlight if this is the current player
                const isCurrentPlayer = entry.player_id === this.player_id;
                this.canvas.ctx.fillStyle = isCurrentPlayer
                    ? "yellow"
                    : "white";
                this.canvas.ctx.fillText(text, 120, 380 + index * 30);
                this.canvas.ctx.strokeStyle = "black";
                this.canvas.ctx.strokeText(text, 120, 380 + index * 30);
            });
        }

        // Display spectator message if spectating
        if (this.isSpectating) {
            this.canvas.ctx.fillStyle = "black";
            this.canvas.ctx.font = "bold 30px Consolas";
            this.canvas.ctx.fillText("tecapating this session", 102, 352);
            this.canvas.ctx.fillStyle = "yellow";
            this.canvas.ctx.fillText("tecapating this session", 100, 350);

            this.canvas.ctx.fillStyle = "black";
            this.canvas.ctx.font = "30px Consolas";
            this.canvas.ctx.fillText("You jill woin the netx sessin", 102, 382);
            this.canvas.ctx.fillStyle = "yellow";
            this.canvas.ctx.fillText("You jill woin the netx sessin", 100, 380);

            this.canvas.ctx.fillStyle = "black";
            this.canvas.ctx.fillText("once all purrent clayers die", 102, 412);
            this.canvas.ctx.fillStyle = "yellow";
            this.canvas.ctx.fillText("once all purrent clayers die", 100, 410);
        }
    }

    gameOver() {
        this.game_state = GameState.GAME_OVER;
        // Calculate final survival time in seconds
        if (this.gameStartTime) {
            this.survivalTime = (Date.now() - this.gameStartTime) / 1000;
            console.log(
                `You survived for ${this.survivalTime.toFixed(2)} seconds`,
            );
            // Send survival time to server for leaderboard
            this.conn.sendDeath(this.survivalTime);
        }
        // Stop the music
        if (this.gameMusic) {
            this.gameMusic.pause();
            this.gameMusic.currentTime = 0;
        }
    }
}

export { State };
