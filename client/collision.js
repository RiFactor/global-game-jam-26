// Checks if a square is colliding with another square. The movable object
// should be argument 2. If they are not colliding, returns `null`. If they
// are, returns a vector pointing from the center of `rect1` to `rect2`.
function rectInRect(x1, y1, w1, h1, x2, y2, w2, h2) {
    if (x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2) {
        const c1x = x1 + w1 / 2;
        const c1y = y1 + h1 / 2;
        const c2x = x2 + w2 / 2;
        const c2y = y2 + h2 / 2;

        const dx = c2x - c1x;
        const dy = c2y - c1y;

        return { x: dx, y: dy };
    }
    return null;
}

class CollisionBox {
    constructor(width, height, x_offset = 0, y_offset = 0) {
        this.width = width;
        this.height = height;
        this.x_offset = x_offset;
        this.y_offset = y_offset;
    }

    draw(canvas, x, y) {
        canvas.ctx.strokeStyle = "red";
        canvas.ctx.strokeRect(
            x + this.x_offset,
            y + this.y_offset,
            this.width,
            this.height,
        );
    }

    // Determines the update that needs to be applied to an entity in terms of
    // its velocity and position. The velocity factors are multiplicative,
    // whereas the position deltas are additive.
    determineUpdate(collision, box, box_vx, box_vy) {
        var vx = 1;
        var vy = 1;
        var dx = 0;
        var dy = 0;

        // determine which region the box is relative to the midpoint of this
        // collision geometry
        const angle = -Math.atan2(collision.y, collision.x);
        const top_left = Math.atan2(this.height / 2, -this.width / 2);

        function toDeg(a) {
            return (a / Math.PI) * 180;
        }

        console.log(toDeg(angle), toDeg(top_left));

        if (
            Math.abs(angle) > Math.PI / 2 &&
            Math.abs(angle) > Math.abs(top_left)
        ) {
            // to the left of the box
            if (box_vx > 0) {
                vx = 0;
            }
        }

        if (
            Math.abs(angle) < Math.PI / 2 &&
            Math.abs(angle) < Math.abs(Math.PI - top_left)
        ) {
            // to the right of the box
            if (box_vx < 0) {
                vx = 0;
            }
        }

        if (angle > Math.PI - top_left && angle < top_left) {
            // above the box
            if (box_vy > 0) {
                vy = 0;
            }
        }

        if (angle > -top_left && angle < top_left - Math.PI) {
            // below the box
            if (box_vy < 0) {
                vy = 0;
            }
        }

        return {
            vx: vx,
            vy: vy,
            dx: dx,
            dy: dy,
        };
    }

    // Check if this box collides with another. Returns a vector, as per
    // `rectInRect`. The `x` and `y` are the positions of the current box,
    // whereas the `box_x` and `box_y` are the positions of the other box.
    collide(x, y, box, box_x, box_y) {
        return rectInRect(
            this.x_offset + x,
            this.y_offset + y,
            this.width,
            this.height,
            box.x_offset + box_x,
            box.y_offset + box_y,
            box.width,
            box.height,
        );
    }
}

export { CollisionBox };
