// Used for storing all the sprites that we need to draw to the screen.
export class SpriteDeck {
    constructor() {
        this.sprite_buffer = new Array();
    }

    // Preload an image. Example usage is
    //
    //     const image_index = await deck.fetchImage("./asset.png");
    //     const image = deck.sprite_buffer[image_index];
    //
    fetchImage(uri) {
        return new Promise((resolve, err) => {
            var image = new Image();
            image.src = uri;
            // Setup a hook to store the image in the buffer
            image.onload = () => {
                console.log(`Asset fetched: ${uri}`);
                this.sprite_buffer.push(image);
                const index = this.sprite_buffer.length;
                resolve(index);
            };
            image.onerror = err;
        });
    }

    get(index) {
        return this.sprite_buffer[index];
    }
}

function clearCanvas(ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function ChessboardPattern(ctx, canvas) {
    const squareSize = 50;
    const rows = Math.ceil(canvas.height / squareSize);
    const cols = Math.ceil(canvas.width / squareSize);

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            if ((row + col) % 2 === 0) {
                ctx.fillStyle = "black";
            } else {
                ctx.fillStyle = "white";
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

function renderSprite(ctx, x, y) {
    var sprite = new Image();
    sprite.src = "./assets/player/lilguy.png";
    // ben nearly went insane - fergus told me to put this in (image might not be loaded yet, so draw in onload)
    sprite.onload = () => {
        ctx.drawImage(sprite, x, y, 100, 100);
    };
}

function renderText(ctx, color, font = "30px Arial", text, x, y) {
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
    // console.log("Text rendered");
}
export function setCanvasSize(canvas) {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

export function initializeCanvas(canvas) {
    const ctx = canvas.getContext("2d");
    setCanvasSize(canvas);
}

export function drawBackground(canvas) {
    ChessboardPattern(canvas.ctx, canvas);
    renderText(
        canvas.ctx,
        "red",
        "50px Arial",
        "Welcome to our lil game, you can control the lil guy with lil WASD keys!",
        100,
        100,
    );
}
