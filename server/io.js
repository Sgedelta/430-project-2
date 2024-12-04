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

const handleTurnInput = async (socket, turnInfo) => {
    // go get and update information on the game
    const gameStatus = await GameLogic.turnRecieved(turnInfo.room, turnInfo.val);

    //error check:
    if(gameStatus.error) {
        //might need to be io?
        socket.to(turnInfo.room).emit('ErrorChannel', gameStatus.error);
        return;
    }

    //the game has been informed of our turn, and we don't need to continue this function. game is waiting.
    if(!gameStatus.continue) {
        return;
    }

    // once we get here, we've recieved both turns.
  // then, construct a obj to send to the game logic.
  //  we would also send room info that identifies the "game" we need to reference. right now that will be
  let turnOptions = {
    roomCode: turnInfo.room,
    p1Opt: null,
    p2Opt: null, 
  };

  if(turnInfo.player === 0) {
    //we are player one
    p1Opt: turnInfo.val;
    p2Opt: gameStatus.opt;
  } else {
    //we are player two
    p1Opt: gameStatus.opt;
    p2Opt: turnInfo.val;
  }

  // send it to Game.js to run the logic, then get the values back
  const gameResult = await GameLogic.handleGameLogic(turnOptions);

  //error check
  if(gameResult.error) {
    //might need to be io
    socket.to(turnInfo.room).emit('ErrorChannel', gameResult.error);
  }

  // might need to be io?
  socket.to(turnInfo.room).emit('TurnComplete', gameResult);
};

const socketSetup = (app, sessionMiddleware) => {
  const server = http.createServer(app);
  io = new Server(server);

  io.engine.use(sessionMiddleware);

  io.on('connection', (socket) => {
    console.log('a user connected');
    const { session } = socket.request; //pull session info

    socket.join(session.id); // join a room that is our sessionID
    socket.join('TempRoom'); // TODO: right now we just put everyone in one game with room code "TempRoom"

    socket.on('disconnect', () => {
      console.log('a user disconnected');
    });

    socket.on('chat message', (msg) => handleChatMessage(socket, msg));
    socket.on('room change', (room) => handleRoomChange(socket, room));

    // function ends early after updating game if this is first turn submited
    socket.on('TurnSent', (turnInfo) => handleTurnInput(socket, turnInfo));
    // creates a new game 
    socket.on('CreateNewGame', () => socketMakeRoom(socket, session));
    // finds a game and sends out info to the socket and/or updates player info in game
    socket.on('RequestJoin', (roomCode) => );
  });

  return server;
};
module.exports = socketSetup;

// A function that attempts to start a new game for the player and then returns via socket if the game was made
const socketMakeRoom = async (socket, session) => {
    const gameResult = await GameLogic.startGame(session);
    if(gameResult.error) {
        socket.emit('ErrorChannel', gameResult);
    } else {
        socket.emit('JoinGame', gameResult.roomCode);
    }
}
