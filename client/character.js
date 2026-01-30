import * as config from "./config.js";

class Character {
    // Accepts an array of sprite frames, which it uses to draw itself. These
    // should be FRONT, BACK, LEFT, RIGHT, in that order.
    constructor(sprite_frames) {
        this.x = 10;
        this.y = 10;
        this.vx = config.SLOW;
        this.vy = config.SLOW;
        this.width = 100;
        this.height = 100;
        this.sprite_frames = sprite_frames;
        this.orientation = 0; // 0=front, 1=back, 2=left, 3=right
    }

    // Draw the sprite.
    draw(canvas, asset_deck) {
        const frame = asset_deck.getSprite(this.sprite_frames[0]);
        canvas.ctx.drawImage(frame, this.x, this.y, this.width, this.height);
    }

    // Called once per loop. Updates all logic and position of the Character.
    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
    }
}

export { Character };
