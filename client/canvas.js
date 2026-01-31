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

function ChessboardPattern(ctx, canvas, asset_bank, x, y) {
    const squareSize = 48;
    const rows = 100;
    const cols = 100;

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

function renderText(ctx, color, font = "30px Arial", text, x, y) {
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
}

export function onResize(canvas) {
    canvas.width = 800;
    canvas.height = 600;
}

function drawBackground(viewport, asset_bank) {
    viewport.draw(
        (canvas, x, y) => {
            ChessboardPattern(canvas.ctx, canvas, asset_bank, x, y);
            renderText(
                canvas.ctx,
                "red",
                "50px Arial",
                "Welcome to our lil game, you can control the lil guy with lil WASD keys!",
                x + 96,
                y + 96,
            );
            addGithubLink(canvas);
        },
        0,
        0,
    );
}

export class GameMap {
    constructor() {}

    draw(dt, canvas, asset_deck) {
        drawBackground(canvas, asset_deck);
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
    follow(dt, x, y, vx, vy) {
        let move_x = 0;
        let move_y = 0;

        // translate to viewport coordinates
        const X = x - this.x;
        const Y = y - this.y;

        if (X < this.move_zone || X > this.width - this.move_zone - 96) {
            move_x += 1;
        }

        if (Y < this.move_zone || Y > this.height - this.move_zone - 96) {
            move_y += 1;
        }

        this.x += this.speed_multiplier * move_x * dt * vx;
        this.y += this.speed_multiplier * move_y * dt * vy;
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
        link.style.fontFamily = "'Consolas', 'monospace'";
        link.style.textAlign = "center";
        link.style.fontStyle = "italic";
        // Insert after canvas
        canvas.parentNode.insertBefore(link, canvas.nextSibling);
    }
}
