const SLOW = 0.1;
const MEDIUM = 0.36;
const FAST = 0.24;

// Make this bigger to make everything bigger
// make it smaller to make everything smaller
const SCALE = 48;

// How close the player can get to the edge before the viewport starts to move
const VIEWPORT_BUFFER = 3 * SCALE;

const TILE_SIZE = 96;

const DRAW_COLLISION = true;

const URI = "ws://127.0.0.1:8000/";

export {
    SLOW,
    MEDIUM,
    FAST,
    URI,
    DRAW_COLLISION,
    TILE_SIZE,
    SCALE,
    VIEWPORT_BUFFER,
};
