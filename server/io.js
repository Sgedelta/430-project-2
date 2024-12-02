const http = require('http');
const { Server } = require('socket.io');
const GameLogic = require('./controllers/Game.js');

let io;

// temp reference method
const handleChatMessage = (socket, msg) => {
  socket.rooms.forEach((room) => {
    if (room === socket.id) return;

    io.to(room).emit('chat message', msg);
  });
};

const handleTurnInput = async (socket, turnVal) => {
  // TODO: for now, just emit our player's change back to the room. We would wait until we got both players and THEN handle game logic

  // first, wait for both players to emit to the room
  // TODO: that!

  // then, construct a obj to send to the game logic.
  //  we would also send room info that identifies the "game" we need to reference. right now that will be
  const turnOptions = {
    roomCode: 'TempRoom',
    p1Opt: turnVal,
    p2Opt: null, // temp!
  };

  // send it to Game.js to run the logic, then get the values back
  const gameResult = await GameLogic.handleGameLogic(turnOptions);

  io.to('TempRoom').emit('TurnComplete', gameResult);
};

const socketSetup = (app) => {
  const server = http.createServer(app);
  io = new Server(server);

  io.on('connection', (socket) => {
    console.log('a user connected');

    GameLogic.startGame();

    socket.join('TempRoom'); // TODO: right now we just put everyone in one game with room code "TempRoom"

    socket.on('disconnect', () => {
      console.log('a user disconnected');
    });

    socket.on('chat message', (msg) => handleChatMessage(socket, msg));
    socket.on('room change', (room) => handleRoomChange(socket, room));

    // TODO: update this to see if we're waiting or if we need to start a new "turn" - so we only send one response back
    socket.on('TurnSent', (turnVal) => handleTurnInput(socket, turnVal));
  });

  return server;
};
module.exports = socketSetup;

const socketMakeRoom = (app) => {
  // TODO: make a new room for a game.

};
