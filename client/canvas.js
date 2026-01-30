
function clearCanvas(ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // console.log("Canvas cleared");
}

function ChessboardPattern(ctx, canvas) {
    const squareSize = 50;
    const rows = Math.ceil(canvas.height / squareSize);
    const cols = Math.ceil(canvas.width / squareSize);

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            if ((row + col) % 2 === 0) {
                ctx.fillStyle = "black";
            }
            else {
                ctx.fillStyle = "white";
            }
            ctx.fillRect(col * squareSize, row * squareSize, squareSize, squareSize);
        }
    }
    // console.log("Chessboard pattern drawn");
}

function renderSprite(ctx, x, y) {
    var sprite = new Image();
    sprite.src = "./assets/player/front1.png"; 
    // ben nearly went insane - fergus told me to put this in (image might not be loaded yet, so draw in onload)
    sprite.onload = () => {
        ctx.drawImage(sprite,x,y,100,100);
        // console.log("Sprite rendered");
    }
}

function renderText(ctx, color, font="30px Arial", text, x, y) {
    ctx.font = font
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
    // console.log("Text rendered");
}

export function setCanvasSize(canvas) {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    // console.log(`Canvas size set to ${canvas.width}x${canvas.height}`);
}

export function initializeCanvas(canvas) {
    const ctx = canvas.getContext("2d");
    setCanvasSize(canvas);
    // console.log("Canvas initialized");
}

export function updateCanvas(canvas, x, y) {
    const ctx = canvas.getContext("2d");
    ChessboardPattern(ctx, canvas);
    renderSprite(ctx, x, y);
    renderText(ctx, "red","50px Arial","Welcome to our lil game, you can control the lil guy with lil WASD keys!", 100, 100);
    // console.log("Canvas updated");
}   
