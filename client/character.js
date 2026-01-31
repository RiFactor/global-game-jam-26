import * as config from "./config.js";
import * as utils from "./utils.js";

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
async function loadPlayerSprites(
    asset_deck,
    { character = "player", tint_key = 0 } = {},
) {
    const frame_indices = [1, 2, 3, 4];

    const fetchFacing = (facing) => {
        return frame_indices.map(async (i) => {
            return asset_deck.fetchImage(
                `assets/${character}/${facing}${i}.png`,
                tint_key,
            );
        });
    };

    const front = fetchFacing("front");
    const back = fetchFacing("back");
    const left = fetchFacing("left");
    const right = fetchFacing("right");

    return await Promise.all(back.concat(front, left, right));
}

// Returns all player mask indices as an array of arrays, where
//
//      ret[i][j]
//
// is the jth orientation of the ith mask.
async function loadAllMaskSprites(
    asset_deck,
    { character = "player", tint_key = "arlecchino" } = {},
) {
    const orientations = ["front", "left", "right"];
    const fetchMask = (name) => {
        return orientations.map(async (i) => {
            return asset_deck.fetchImage(
                `assets/${character}/masks/${name}/${i}.png`,
                tint_key,
            );
        });
    };

    var all_promises = new Array();
    all_promises = all_promises.concat(fetchMask("arlecchino"));

    // await all of them together
    const all_masks = await Promise.all(all_promises);
    const back = await asset_deck.fetchImage(
        `assets/${character}/masks/back.png`,
        tint_key,
    );

    // split back up into their characters
    var masks = new Array();
    for (let i = 0; i < 1; i += 3) {
        // get the masks and add in the back index in the right location
        let m = all_masks.slice(i * 3, i + 3);
        m.splice(0, 0, back);
        masks.push(m);
    }

    return masks;
}

class Character {
    // Accepts an array of sprite frames, which it uses to draw itself. These
    // should be `Facing` order (see above).
    constructor(sprite_frames, mask_frames) {
        this.x = 0;
        this.y = 0;
        this.vx = 0;
        this.vy = 0;
        this.speed = config.MEDIUM;
        this.width = 96;
        this.height = 96;
        this.sprite_frames = sprite_frames;
        this.mask_frames = mask_frames;
        // Orientation is the same as Facing
        this.orientation = Facing.DOWN;

        this.timer = 0;
        this.draw_state = DrawSate.STATIONARY;
        this.anim_frame = 0;
        this.frame_delay = 100;
    }

    // Draw the sprite.
    draw(dt, viewport, asset_deck) {
        this.timer += dt;

        if (this.draw_state == DrawSate.MOVING) {
            if (Math.floor(this.timer / this.frame_delay) > 1) {
                this.timer = 0;
                this.anim_frame += 1;
            }
            if (this.anim_frame > 3) {
                this.anim_frame = 0;
            }
        } else {
            this.timer = 0;
            this.anim_frame = 0;
        }

        const frame_index =
            this.sprite_frames[this.orientation * 4 + this.anim_frame];
        const frame = asset_deck.getSprite(frame_index);

        const mask_frame = asset_deck.getSprite(
            this.mask_frames[0][this.orientation],
        );

        viewport.draw(
            (canvas, x, y) => {
                canvas.ctx.drawImage(frame, x, y, this.width, this.height);
                canvas.ctx.drawImage(mask_frame, x, y, this.width, this.height);
            },
            this.x,
            this.y,
        );
    }

    // Called once per loop. Updates all logic and position of the Character.
    update(dt, up, down, left, right) {
        // work out which direction the player is moving
        var vx = 0;
        var vy = 0;
        if (right) {
            vx += 1;
        }
        if (left) {
            vx -= 1;
        }
        if (up) {
            vy -= 1;
        }
        if (down) {
            vy += 1;
        }

        this.setMovement(vx, vy);
        this.x += this.vx * dt;
        this.y += this.vy * dt;
    }

    // Given a `facing` direction, move the character that way.
    setMovement(vx, vy) {
        if (vx == 0 && vy == 0) {
            this.draw_state = DrawSate.STATIONARY;
            this.vx = 0;
            this.vy = 0;
            return;
        }

        if (vy == 0) {
            if (vx > 0) {
                this.orientation = Facing.RIGHT;
            } else {
                this.orientation = Facing.LEFT;
            }
        }
        if (vx == 0) {
            if (vy > 0) {
                this.orientation = Facing.DOWN;
            } else {
                this.orientation = Facing.UP;
            }
        }

        const norm = utils.magnitude(vx, vy);
        this.draw_state = DrawSate.MOVING;
        this.vx = (vx / norm) * this.speed;
        this.vy = (vy / norm) * this.speed;
    }
}

export { Character, Facing, loadPlayerSprites, loadAllMaskSprites };
