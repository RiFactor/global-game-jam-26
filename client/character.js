import * as config from "./config.js";

// An immutable enumeration representing the directions that a character can be
// facing / moving.
const Facing = Object.freeze({
    UP: 0,
    DOWN: 1,
    LEFT: 2,
    RIGHT: 3,
});

const DrawSate = Object.freeze({
    STATIONARY: 0,
    MOVING: 1,
});

// Returns an array of integer indexes for the `asset_deck`.
// Call as
//
//      loadPlayerSprites(asset_deck); // defaults to player
//      loadPlayerSprites(asset_deck, {character = "something"});
//
async function loadPlayerSprites(asset_deck, { character = "player" } = {}) {
    const frame_indices = [1, 2, 3, 4];

    const fetch_facing = (facing) => {
        return frame_indices.map(async (i) => {
            return asset_deck.fetchImage(`assets/player/${facing}${i}.png`);
        });
    };

    const front = fetch_facing("front");
    const back = fetch_facing("back");
    const left = fetch_facing("left");
    const right = fetch_facing("right");

    return await Promise.all(back.concat(front, left, right));
}

class Character {
    // Accepts an array of sprite frames, which it uses to draw itself. These
    // should be `Facing` order (see above).
    constructor(sprite_frames) {
        this.x = 10;
        this.y = 10;
        this.vx = 0;
        this.vy = 0;
        this.speed = config.MEDIUM;
        this.width = 100;
        this.height = 100;
        this.sprite_frames = sprite_frames;
        // Orientation is the same as Facing
        this.orientation = Facing.DOWN;

        this.timer = 0;
        this.draw_state = DrawSate.STATIONARY;
    }

    // Draw the sprite.
    draw(dt, canvas, asset_deck) {
        this.timer += dt;

        var anim_frame = 0;

        if (this.draw_state == DrawSate.MOVING) {
            anim_frame = Math.floor(this.timer / 100);
            if (anim_frame >= 3) {
                this.timer = 0;
                anim_frame = 3;
            }
        }

        const frame_index =
            this.sprite_frames[this.orientation * 4 + anim_frame];
        const frame = asset_deck.getSprite(frame_index);
        canvas.ctx.drawImage(frame, this.x, this.y, this.width, this.height);
    }

    // Called once per loop. Updates all logic and position of the Character.
    update(dt) {
        const norm = Math.sqrt(Math.pow(this.vx, 2) + Math.pow(this.vy, 2));
        if (norm > 0) {
            this.draw_state = DrawSate.MOVING;
            this.x += (this.vx / norm) * this.speed * dt;
            this.y += (this.vy / norm) * this.speed * dt;
        } else {
            this.draw_state = DrawSate.STATIONARY;
        }
    }

    // Given a `facing` direction, move the character that way.
    startMove(facing) {
        console.log(`Moving ${facing}`);
        switch (facing) {
            case Facing.UP:
                this.vy = -1;
                break;
            case Facing.DOWN:
                this.vy = 1;
                break;
            case Facing.LEFT:
                this.vx = -1;
                break;
            case Facing.RIGHT:
                this.vx = 1;
                break;
            default:
                throw new Error("Unreachable");
        }
        this.orientation = facing;
    }

    // Called to stop motion in a given direction from `facing`.
    stopMove(facing) {
        console.log(`Stop moving ${facing}`);
        switch (facing) {
            case Facing.UP:
            case Facing.DOWN:
                this.vy = 0;
                break;
            case Facing.LEFT:
            case Facing.RIGHT:
                this.vx = 0;
                break;
            default:
                throw new Error("Unreachable");
        }
    }
}

export { Character, Facing, loadPlayerSprites };
