import * as config from "./config.js";
import * as utils from "./utils.js";
import { CollisionBox } from "./collision.js";

// Used for storing all the assets that we need to include (sprites and audio).
export class AssetDeck {
    constructor() {
        this.sprite_buffer = new Array();
        this.audio_buffer = new Array();
        this.file_buffer = new Array();
        this.tint_buffer = new Map();
    }

    toDoubleHex(number) {
        var basic = number.toString(16);
        if (basic.length > 1) {
            return basic;
        } else {
            return "0" + basic;
        }
    }

    randomTint() {
        var r = Math.abs(utils.gaussianRandom());
        var g = Math.abs(utils.gaussianRandom());
        var b = Math.abs(utils.gaussianRandom());
        var normalisation = 255.0 / Math.sqrt(r * r + g * g + b * b);
        var normalised_r = Math.round(r * normalisation);
        var normalised_g = Math.round(g * normalisation);
        var normalised_b = Math.round(b * normalisation);
        return (
            "#" +
            this.toDoubleHex(normalised_r) +
            this.toDoubleHex(normalised_g) +
            this.toDoubleHex(normalised_b)
        );
    }

    // Gets or generates the fill tint for a given key.
    getOrCreateTint(tint_key) {
        if (!this.tint_buffer.has(tint_key)) {
            this.tint_buffer.set(tint_key, this.randomTint());
        }
        return this.tint_buffer.get(tint_key);
    }

    // Preload an image. Example usage is
    //
    //     const image_index = await deck.fetchImage("./asset.png", "arlecchino");
    //     const image = deck.sprite_buffer[image_index];
    //
    fetchImage(uri, tint_key) {
        return new Promise((resolve, err) => {
            var image = new Image();
            image.src = uri;
            // Setup a hook to store the image in the buffer
            image.onload = () => {
                console.log(`Asset fetched: ${uri}`);
                var subcanvas = new OffscreenCanvas(image.width, image.height);
                var draw_context = subcanvas.getContext("2d");
                draw_context.drawImage(image, 0, 0);
                draw_context.fillStyle = this.getOrCreateTint(tint_key);
                draw_context.globalCompositeOperation = "multiply";
                draw_context.fillRect(0, 0, image.width, image.height);
                var tinted_bitmap = subcanvas.transferToImageBitmap();
                draw_context.clearRect(0, 0, image.width, image.height);
                draw_context.globalCompositeOperation = "source-over";
                draw_context.drawImage(image, 0, 0);
                draw_context.globalCompositeOperation = "source-in";
                draw_context.drawImage(tinted_bitmap, 0, 0);
                this.sprite_buffer.push(subcanvas.transferToImageBitmap());
                const index = this.sprite_buffer.length - 1;
                resolve(index);
            };
            image.onerror = err;
        });
    }

    // Preload an audio file. Same functionality as fetchImage above
    fetchAudio(uri) {
        return new Promise((resolve, err) => {
            var audio = new Audio();
            audio.src = uri;
            // Setup a hook to store the audio in the buffer
            audio.onload = () => {
                console.log(`Asset fetched: ${uri}`);
                this.audio_buffer.push(audio);
                const index = this.audio_buffer.length - 1;
                resolve(index);
            };
            audio.onerror = err;
        });
    }

    // Fetch a file as text.
    fetchFile(uri) {
        return new Promise((resolve, err) => {
            fetch(uri)
                .then((response) => {
                    return response.text();
                })
                .then((text) => {
                    this.file_buffer.push(text);
                    const index = this.file_buffer.length - 1;
                    resolve(index);
                });
        });
    }

    // Getter for sprites
    getSprite(index) {
        return this.sprite_buffer[index];
    }

    // Getter for audio
    getAudio(index) {
        return this.audio_buffer[index];
    }
}

function ChessboardPattern(ctx, canvas, asset_bank, rows, cols, x, y) {
    const squareSize = config.TILE_SIZE;

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            if ((row + col) % 2 === 0) {
                ctx.fillStyle = asset_bank.getOrCreateTint("black");
            } else {
                ctx.fillStyle = asset_bank.getOrCreateTint("white");
            }
            ctx.fillRect(
                col * squareSize + x,
                row * squareSize + y,
                squareSize,
                squareSize,
            );
        }
    }
}

function renderPlayerStatsMask(ctx, player, asset_bank, x, y) {
    const maskImage = asset_bank.getSprite(player.mask_frames[player.mask][1]);
    var size = 30;
    ctx.drawImage(maskImage, x, y - 5 - size / 2, size, size);
}

function renderPlayerStats(ctx, player, x, y, bold, asset_bank) {
    renderPlayerStatsMask(ctx, player, asset_bank, x, y);

    var playerName = "";
    if (player.player_id && typeof player.player_id === "string") {
        // Handle IPv6-mapped IPv4 addresses (e.g., "::ffff:192.168.1.1:12345")
        if (player.player_id.includes("f:")) {
            playerName = String(player.player_id.split("f:")[1]);
        } else {
            // Handle regular IPv4 addresses (e.g., "127.0.0.1:12345")
            playerName = player.player_id;
        }
    }

    renderText(
        canvas.ctx,
        "black",
        "20px Consolas",
        playerName || "Offline",
        x + 40,
        y,
        bold,
    );
    renderText(
        canvas.ctx,
        "white",
        "20px Consolas",
        playerName || "Offline",
        x + 38,
        y - 2,
        bold,
    );
}

function renderStatusBar(ctx, player, x, y, bold, asset_bank) {
    const maskCount = player.mask_frames.length;
    const prevMaskIndex = (player.mask - 1 + maskCount) % maskCount;
    const nextMaskIndex = (player.mask + 1) % maskCount;

    const leftMask = asset_bank.getSprite(player.mask_frames[prevMaskIndex][1]);
    var size = 50;
    ctx.drawImage(leftMask, x - size, y + 10, size, size);

    const currentMask = asset_bank.getSprite(
        player.mask_frames[player.mask][1],
    );
    ctx.drawImage(currentMask, x, y, size, size);

    const rightMask = asset_bank.getSprite(
        player.mask_frames[nextMaskIndex][1],
    );
    ctx.drawImage(rightMask, x + size, y + 10, size, size);
}

function renderText(ctx, color, font = "30px Arial", text, x, y, bold) {
    ctx.font = font;
    ctx.fillStyle = color;
    if (bold) {
        ctx.font = "bold " + font;
    }
    ctx.fillText(text, x, y);
}

export function onResize(canvas) {
    canvas.width = 800;
    canvas.height = 600;
}

function drawBackground(viewport, asset_bank, rows, cols) {
    viewport.draw(
        (canvas, x, y) => {
            ChessboardPattern(canvas.ctx, canvas, asset_bank, rows, cols, x, y);
            addGithubLink(canvas);
        },
        0,
        0,
    );
}

// HUD
function drawForeground(canvas, asset_bank, player, other_players) {
    var leftPadding = 5;
    var topPadding = 25;

    renderPlayerStats(
        canvas.ctx,
        player,
        leftPadding,
        topPadding,
        true,
        asset_bank,
    );

    for (let i = 0; i < other_players.length; i++) {
        renderPlayerStats(
            canvas.ctx,
            other_players[i],
            leftPadding,
            topPadding + (i + 1) * topPadding,
            false,
            asset_bank,
        );
    }

    renderStatusBar(
        canvas.ctx,
        player,
        canvas.width / 2,
        canvas.height - 50,
        true,
        asset_bank,
    );
}

class Structure {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.collision_box = new CollisionBox(width, height);
    }

    draw(canvas, x, y) {
        canvas.ctx.fillStyle = "black";
        canvas.ctx.fillRect(
            x,
            y,
            this.collision_box.width,
            this.collision_box.height,
        );
    }
}

export class GameMap {
    constructor() {
        this.x_size = 0;
        this.y_size = 0;
        // TODO: make this a constant in the config
        this.tile_size = config.TILE_SIZE;
        this.structures = new Array();
    }

    draw(dt, viewport, asset_deck) {
        drawBackground(viewport, asset_deck, this.x_size, this.y_size);
        this.structures.forEach((s) => {
            viewport.draw(
                (canvas, x, y) => {
                    s.draw(canvas, x, y);
                    if (config.DRAW_COLLISION) {
                        s.collision_box.draw(canvas, x, y);
                    }
                },
                s.x,
                s.y,
            );
        });
    }

    _setBoundaries() {
        // left bar
        this.structures.push(
            new Structure(0, 0, this.tile_size, this.y_size * this.tile_size),
        );
        // top bar
        this.structures.push(
            new Structure(0, 0, this.x_size * this.tile_size, this.tile_size),
        );
        // right bar
        this.structures.push(
            new Structure(
                (this.x_size - 1) * this.tile_size,
                0,
                this.tile_size,
                this.y_size * this.tile_size,
            ),
        );
        // bottom bar
        this.structures.push(
            new Structure(
                0,
                (this.y_size - 1) * this.tile_size,
                this.x_size * this.tile_size,
                this.tile_size,
            ),
        );
    }

    setMap(ascii_map) {
        const matrix = utils.textToMatrix(ascii_map);
        this.y_size = matrix.length;
        if (this.y_size > 0) {
            this.x_size = matrix[0].length;
        }

        // for each row
        matrix.forEach((row, j) => {
            const y_offset = j * this.tile_size;
            row.forEach((cell, i) => {
                const x_offset = i * this.tile_size;

                if (cell == "1") {
                    this.structures.push(
                        new Structure(
                            x_offset,
                            y_offset,
                            this.tile_size,
                            this.tile_size,
                        ),
                    );
                }
            });
        });

        console.log(matrix);
        this._setBoundaries();
    }

    // Check for collisions with a character
    collide(character) {
        this.structures.forEach((s) => {
            const collision = s.collision_box.collide(
                s.x,
                s.y,
                character.collision_box,
                character.x,
                character.y,
            );
            if (collision !== null) {
                const update = s.collision_box.determineUpdate(
                    collision,
                    character.collision_box,
                    character.vx,
                    character.vy,
                );
                character.vx *= update.vx;
                character.vy *= update.vy;
                character.x += update.dx;
                character.y += update.dy;
            }
        });
    }
}

export class HUD {
    constructor() {
        this.minimap_margin = 20;
    }

    drawMinimap(canvas, game_map, asset_deck, player, other_players) {
        const height = game_map.y_size * config.MINIMAP_SCALE;
        const width = game_map.x_size * config.MINIMAP_SCALE;
        const canvas_x = canvas.width - width - this.minimap_margin;
        const canvas_y = canvas.height - height - this.minimap_margin;

        canvas.ctx.fillStyle = "green";
        canvas.ctx.strokeStyle = "black";
        canvas.ctx.strokeRect(canvas_x, canvas_y, width, height);
        canvas.ctx.fillRect(canvas_x, canvas_y, width, height);

        const drawPlayerIndicator = (p) => {
            canvas.ctx.fillStyle = "red";
            const x = (p.x / config.TILE_SIZE) * config.MINIMAP_SCALE;
            const y = (p.y / config.TILE_SIZE) * config.MINIMAP_SCALE;

            const currentMask = asset_deck.getSprite(p.mask_frames[p.mask][1]);
            canvas.ctx.drawImage(
                currentMask,
                canvas_x + x,
                canvas_y + y,
                config.MINIMAPE_INDICATOR_SCALE,
                config.MINIMAPE_INDICATOR_SCALE,
            );
        };

        drawPlayerIndicator(player);
        other_players.forEach(drawPlayerIndicator);
    }

    draw(dt, viewport, asset_deck, player, other_players, game_map) {
        // important info
        // players are never deleted so the length of other_players will never decrease
        // when a player leaves/ disconnects, they re enter a new player
        // to tell is a player is active, they have a draw state of 1, deactive is 0

        const active_others = other_players.filter((p) => p.active == true);

        drawForeground(viewport.canvas, asset_deck, player, active_others);
        // draw the map in the bottom right corner of the canvas
        this.drawMinimap(canvas, game_map, asset_deck, player, active_others);
    }
}

export class ViewPort {
    constructor(canvas) {
        this.x = 0;
        this.y = 0;

        this.height = 600;
        this.width = 800;
        this.speed_multiplier = 1;

        // How large zone should be where the camera starts to
        // follow the player.
        this.move_zone = config.VIEWPORT_BUFFER;
        this.canvas = canvas;
    }

    draw(callback, x, y) {
        callback(this.canvas, x - this.x, y - this.y);
    }

    // Used to work out which horizontal direction the viewport needs to move
    // given a target point `x`
    _xSign(x) {
        return Math.sign(x - this.x + this.width / 2);
    }

    // Used to work out which vertical direction the viewport needs to move
    // given a target point `y`
    _ySign(y) {
        return Math.sign(y - this.y + this.height / 2);
    }

    // Center the viewport on a given point moving with a given speed.
    follow(dt, x, y, vx, vy) {
        let move_x = 0;
        let move_y = 0;

        // translate to viewport coordinates
        const X = x - this.x;
        const Y = y - this.y;

        if (X < this.move_zone) {
            move_x -= 1;
        } else if (X > this.width - this.move_zone - config.SCALE) {
            move_x += 1;
        }

        if (Y < this.move_zone) {
            move_y -= 1;
        } else if (Y > this.height - this.move_zone - config.SCALE) {
            move_y += 1;
        }

        this.x += this.speed_multiplier * move_x * dt * Math.abs(vx);
        this.y += this.speed_multiplier * move_y * dt * Math.abs(vy);

        // Clip to the size of the world
        this.x = Math.max(0, this.x);
        this.y = Math.max(0, this.y);
    }
}

function addGithubLink(canvas) {
    if (!document.getElementById("github-logo-link")) {
        const link = document.createElement("a");
        link.id = "github-logo-link";
        link.href = "https://github.com/RiFactor/global-game-jam-26";
        link.textContent = "View on GITHUB";
        link.target = "_blank";
        link.style.margin = "10px 10px 10px 10px";
        link.style.background = "#c2c0bc";
        link.style.borderRadius = "999px/48px";
        link.style.border = "4px solid #333";
        link.style.boxShadow = "0 4px 16px rgba(0,0,0,0.18)";
        link.style.textDecoration = "none";
        link.style.color = "#333";
        link.style.fontWeight = "bold";
        link.style.fontSize = "1.2em";
        link.style.letterSpacing = "0.1em";
        link.style.fontFamily = "'Consolas'";
        link.style.textAlign = "center";
        link.style.fontStyle = "italic";
        link.style.userSelect = "none";
        // Insert after canvas
        canvas.parentNode.insertBefore(link, canvas.nextSibling);
    }
}
