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
        socket.emit('ErrorChannel', gameStatus.error);
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
    turnOptions.p1Opt = turnInfo.val;
    turnOptions.p2Opt = gameStatus.opt;
  } else {
    //we are player two
    turnOptions.p1Opt = gameStatus.opt;
    turnOptions.p2Opt = turnInfo.val;
  }

  // send it to Game.js to run the logic, then get the values back
  const gameResult = await GameLogic.handleGameLogic(turnOptions);

  //error check
  if(gameResult.error) {
    io.to(turnInfo.room).emit('ErrorChannel', gameResult.error);
  }

  
  io.to(turnInfo.room).emit('TurnComplete', gameResult);
};

const returnGameState = async (roomCode) => {
    let state = await GameLogic.getGameData(roomCode);

    if(!state || state === null) {
        state = {error: `Error retriving game, Game with code ${roomCode} may not exist!`}
    }

    return state;
}


// A function that attempts to start a new game for the player and then returns via socket if the game was made
const socketMakeRoom = async (socket, session) => {
    const gameResult = await GameLogic.startGame(session);
    if(gameResult.error) {
        socket.emit('ErrorChannel', gameResult);
    } else {
        socket.emit('JoinGame', {roomCode: gameResult.roomCode, player: 0});
    }
}

const socketJoinGame = async (socket, session, roomCode, returnData) => {
    
    //make sure we have a socket, session, and roomCode
    if(!socket || !session) {
        return {error: "Error joining game, socket or session do not exist!"};
    } else if (!roomCode) {
        socket.emit('ErrorChannel', {error: 'roomCode does not exist!'});
        return;
    }
    
    
    // first, confirm that the game exists 
    const gameRequest = await GameLogic.doesGameWithCodeExist(roomCode);

    //error check
    if(gameRequest.error) {
        socket.emit('ErrorChannel', gameRequest);
        return;
    }

    if(gameRequest.exists === false) {
        socket.emit('ErrorChannel', {error: `Game with code ${roomCode} does not exist!`});
        return;
    }

    // now, see if we are one of the players in the room already
    const {game} = gameRequest;
    let joinInfo = {
        roomCode: game.roomCode,
    };

    if(game.player1._id.equals(session.account._id) ) {
        joinInfo.player = 0;
    } 
    else if (game.player2 === undefined) { //check if undefined firstqqqqqqqqqqqqqqqqq
        await GameLogic.joinPlayerToGame(game.roomCode, session.account._id);
        joinInfo.player = 1;
    }
    else if ( game.player2._id.equals(session.account._id) ) {
        joinInfo.player = 1;
    } 


    socket.join(joinInfo.roomCode);

    if(returnData) {
        socket.emit('JoinGame', joinInfo);
        
    }
    
    return ;
    
}

const socketRejoinOldRooms = async (socket, session) => {

    if(!session || !session.account || !session.account.username) {
        const error = {error: 'Error Rejoining rooms due to session error'};
        socket.emit('ErrorChannel', error);
        return;
    }
    
    // query game to find rooms with this player is in an active game (1 or 2)
    const gamesData = await GameLogic.findAllGamesWithPlayer(session.account.username);
    // if they are, return the room code(s) and join to those rooms.
    gamesData.forEach((game) => {
        console.log(`joining ${session.account.username} to room ${game.roomCode}`);
        socket.join(game.roomCode);
    });
}


const socketSetup = (app, sessionMiddleware) => {
    const server = http.createServer(app);
    io = new Server(server);
  
    io.engine.use(sessionMiddleware);
  
    io.on('connection', (socket) => {
      console.log('a user connected');
      const { session } = socket.request; //pull session info
  
      socket.join(session.id); // join a room that is our sessionID    


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
      socket.on('RequestJoin', (roomCode) => socketJoinGame(socket, session, roomCode, true));
      // answer game state requests from client
      socket.on('RequestGameState', async (roomCode) => {
        let gameState = await returnGameState(roomCode);

        if(gameState.error) {
            socket.emit('ErrorChannel', gameState);
            return;
        }

        socket.emit('SetInfo', gameState);
      });
    
      //rejoin the socket to any rooms that it is already in
      socketRejoinOldRooms(socket, session);
    });
  
    return server;
  };
  module.exports = socketSetup;