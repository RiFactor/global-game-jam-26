import * as config from "./config.js";
import * as utils from "./utils.js";

// Used for storing all the assets that we need to include (sprites and audio).
export class AssetDeck {
    constructor() {
        this.sprite_buffer = new Array();
        this.audio_buffer = new Array();
        this.tint_buffer = new Map();
    }

    gaussianRandom() {
        const u = 1 - Math.random();
        const v = Math.random();
        return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
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
        var r = Math.abs(this.gaussianRandom());
        var g = Math.abs(this.gaussianRandom());
        var b = Math.abs(this.gaussianRandom());
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
        return this.tint_buffer.getOrInsertComputed(tint_key, (key) =>
            this.randomTint(),
        );
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
                const index = this.audio_buffer.length;
                resolve(index);
            };
            audio.onerror = err;
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

function ChessboardPattern(ctx, canvas, asset_bank) {
    const squareSize = 50;
    const rows = Math.ceil(canvas.height / squareSize);
    const cols = Math.ceil(canvas.width / squareSize);

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            if ((row + col) % 2 === 0) {
                ctx.fillStyle = asset_bank.getOrCreateTint("black");
            } else {
                ctx.fillStyle = asset_bank.getOrCreateTint("white");
            }
            ctx.fillRect(
                col * squareSize,
                row * squareSize,
                squareSize,
                squareSize,
            );
        }
    }
}

function renderText(ctx, color, font = "30px Arial", text, x, y) {
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
}

export function onResize(canvas) {
    canvas.width = 800;
    canvas.height = 600;
}

export function initializeCanvas(canvas) {
    const ctx = canvas.getContext("2d");
    setCanvasSize(canvas);
}

export function drawBackground(canvas, asset_bank) {
    ChessboardPattern(canvas.ctx, canvas, asset_bank);
    renderText(
        canvas.ctx,
        asset_bank.getOrCreateTint("text"),
        "50px Arial",
        "Welcome to our lil game, you can control the lil guy with lil WASD keys!",
        100,
        100,
    );
}

export class GameMap {
    constructor() {}

    draw(dt, canvas, asset_deck) {
        drawBackground(canvas);
    }
}

export class ViewPort {
    constructor(canvas) {
        this.x = 0;
        this.y = 0;

        this.height = 600;
        this.width = 800;
        this.speed_multiplier = 2;

        // How large zone should be where the camera starts to
        // follow the player.
        this.move_zone = 20;
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
    follow(dt, x, y, speed) {
        let vx = 0;
        let vy = 0;

        // translate to viewport coordinates
        const X = x - this.x;
        const Y = y - this.y;

        if (X < this.move_zone) {
            vx = -this._xSign(x);
        } else if (X > this.width - this.move_zone - 100) {
            vx = this._xSign(x);
        }

        if (Y < this.move_zone) {
            vy = -this._ySign(y);
        } else if (Y > this.height - this.move_zone - 100) {
            vy = this._ySign(y);
        }

        const norm = utils.magnitude(vx, vy);
        if (norm > 0) {
            this.x += (this.speed_multiplier * vx * dt * speed) / norm;
            this.y += (this.speed_multiplier * vy * dt * speed) / norm;
        }
    }
}
