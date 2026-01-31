
//     send(player) {
//         this.websocket.send(JSON.stringify(update))
//     }
// }

// Q prettier?


const io = require('socket.io')(3000, {
    cors: {
        origin: '*'
    }
});

let gameState = {}
// player_id
let playerContent = { 
    // just declare here then define variables later?
    x_pos: 0, 
    y_pos: 0,
    orientate: right, // orientation deprecated
    moving: false, // drawstate - check vars expected
    mask: false // mask - check vars expected
}

let currentId = 0;
player.Id = currentId;
currentId + 1;


io.on('connection', (socket) => {
    console.log("player connected:", socket.Id)

    gameState[socket.Id] = {x_pos: 0, y_pos: 0, orientate: right, moving: false, mask: false }
})