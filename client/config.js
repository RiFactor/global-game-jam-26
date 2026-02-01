const SLOW = 0.1;
const MEDIUM = 0.36;
const FAST = 0.24;

const CANVAS_HEIGHT = 672;
const CANVAS_WIDTH = 864;

const WORLD_MAP = "/assets/maps/ascii-map-2.txt";

// Make this bigger to make everything bigger
// make it smaller to make everything smaller
const SCALE = 48;

// How many pixels per tile
const MINIMAP_SCALE = 2;
const MINIMAPE_INDICATOR_SCALE = 20;

// How close the player can get to the edge before the viewport starts to move
const VIEWPORT_BUFFER = 3 * SCALE;

const TILE_SIZE = 96;

const DRAW_COLLISION = false;

const SHOW_MESSAGE_TIMER = 3000;
// In miliseconds
const RESET_TIME = 3000;

// How fast an individual enemy ticks down the health bar.
const DAMAGE_RATE = 0.05;

// Use the current hostname instead of hardcoded localhost
// This allows mobile devices to connect to the server
// Fallback to 127.0.0.1 if hostname is empty or if running in Node.js
const hostname =
    typeof window !== "undefined"
        ? window.location.hostname || "127.0.0.1"
        : "127.0.0.1";
const URI = `ws://${hostname}:8000/`;

const MASK_CONFIG = [
    ["arlecchino", [0, 0, 0, 0]],
    ["il-dottore", [0, 0, 0, 0]],
    ["scaramouche", [0, 0, -14, 14]],
];

const MASK_COUNT = MASK_CONFIG.length - 1;

const SPAWN_FREQUENCY = 10;
const SPAWN_INCREMENT = 50;

export {
    SLOW,
    MEDIUM,
    FAST,
    URI,
    DRAW_COLLISION,
    TILE_SIZE,
    SCALE,
    VIEWPORT_BUFFER,
    MASK_CONFIG,
    MASK_COUNT,
    MINIMAP_SCALE,
    MINIMAPE_INDICATOR_SCALE,
    SPAWN_FREQUENCY,
    SPAWN_INCREMENT,
    DAMAGE_RATE,
    CANVAS_WIDTH,
    CANVAS_HEIGHT,
    SHOW_MESSAGE_TIMER,
    WORLD_MAP,
    RESET_TIME,
};
