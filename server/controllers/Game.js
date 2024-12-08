const models = require('../models');
const { Game, Account } = models;

const gamePage = async (req, res) => res.render('app');
module.exports.gamePage = gamePage;

const getNewPlayerData = async (username) => {
    // get user data
    let playerData = {};
    try {
        const query = {username: username}
        const user = await Account.findOne(query).lean().exec();



        //generate the new room code
        playerData.newRoomCode = `${user.username}${user.gamesHosted}`;
        //send this player's mongoose id to the game to log it
        playerData.player1_id = user._id;

        Account.findOneAndUpdate(query, {gamesHosted: user.gamesHosted+1}).lean().exec();



    } catch (err) {
        console.log(err);
        return {error: "An error occured finding player!"};
    }
    return playerData;
};

const startGame = async (session) => {

  const playerData = await getNewPlayerData(session.account.username);

  if(playerData.error) {
    // TODO: handle error here!
    return {error: `Error Starting Game: ${playerData.error}`}
  }

  const gameData = {
    player1: playerData.player1_id,
    roomCode: playerData.newRoomCode,
  };

  try {
    const newGame = new Game(gameData);
    await newGame.save();
    return { message: 'Game Created', roomCode: newGame.roomCode, player: 0 }; // temp message?
  } catch (err) {
    console.log(err);
    if (err.code === 11000) {
      return { error: `Game with attempted code already exists! Try Again!` };
    }
    return { error: 'Error Starting Game!' };
  }
  
};
module.exports.startGame = startGame;

const UpdateDocs = (turnOpts, oldDocs) => {
  const newDocs = oldDocs;
  // process p1
  switch (turnOpts.p1Opt) {
    case 'gain':
      newDocs.p1Points += 1;
      break;

    case 'setback':
      if (turnOpts.p2Opt === 'gain') {
        newDocs.p2Points -= 1;
      } else if (turnOpts.p2Opt === 'setback') {
        newDocs.p1Points -= 1;
        newDocs.p2Points -= 1;
      }
      break;

    case 'rest':
      newDocs.p1Uses = {
        exp_gain: 1,
        reset: 1,
        sacrifice: 2,
        steal: 2,
      };
      break;

    case 'exp_gain':
      newDocs.p1Points += 2;
      newDocs.p1Uses.exp_gain -= 1;
      break;

    case 'sacrifice':
      newDocs.p1Points -= 1;
      newDocs.p2Points -= 2;
      newDocs.p1Uses.sacrifice -= 1;
      break;

    case 'steal':
      newDocs.p2Points -= 1;
      newDocs.p1Points += 1;
      newDocs.p1Uses.steal -= 1;
      break;

    default:
      break;
  }

  // process p2 (same as p1 but switch p1 and p2)
  switch (turnOpts.p2Opt) {
    case 'gain':
      newDocs.p2Points += 1;
      break;

    case 'setback':
      if (turnOpts.p1Opt === 'gain') {
        newDocs.p1Points -= 1;
      } else if (turnOpts.p1Opt === 'setback') {
        newDocs.p2Points -= 1;
        newDocs.p1Points -= 1;
      }
      break;

    case 'rest':
      newDocs.p2Uses = {
        exp_gain: 1,
        reset: 1,
        sacrifice: 2,
        steal: 2,
      };
      break;

    case 'exp_gain':
      newDocs.p2Points += 2;
      newDocs.p2Uses.exp_gain -= 1;
      break;

    case 'sacrifice':
      newDocs.p2Points -= 1;
      newDocs.p1Points -= 2;
      newDocs.p2Uses.sacrifice -= 1;
      break;

    case 'steal':
      newDocs.p1Points -= 1;
      newDocs.p2Points += 1;
      newDocs.p2Uses.steal -= 1;
      break;

    default:
      break;
  }

  // handle reset AFTER other things, because it needs points to be gained first.
  if (turnOpts.p1Opt === 'reset') {
    if (newDocs.p1Points >= 4 && newDocs.p2Points >= 4) {
      newDocs.p1Points = 0;
      newDocs.p2Points = 0;
      if (turnOpts.p2Opt !== 'reset') {
        newDocs.p1Points = 1;
      }
    }
    newDocs.p1Uses.reset -= 1;
  }
  if (turnOpts.p2Opt === 'reset') {
    if (newDocs.p1Points >= 4 && newDocs.p2Points >= 4) {
      newDocs.p1Points = 0;
      newDocs.p2Points = 0;
      if (turnOpts.p1Opt !== 'reset') {
        newDocs.p2Points = 1;
      }
    }
    newDocs.p2Uses.reset -= 1;
  }

  if (newDocs.p1Points < 0) {
    newDocs.p1Points = 0;
  }
  if (newDocs.p2Points < 0) {
    newDocs.p2Points = 0;
  }
  if (newDocs.p1Points >= 5 && newDocs.p2Points >= 5) {
    newDocs.p1Points = 4;
    newDocs.p2Points = 4;
  }

  if (newDocs.p1Points >= 5) {
    newDocs.winner = 'Player 1';
    newDocs.gameOver = true;
  } else if (newDocs.p2Points >= 5) {
    newDocs.winner = 'Player 2';
    newDocs.gameOver = true;
  }

  return newDocs;
};

const handleGameLogic = async (turnOptions) => {
  // TODO: handle game logic and then return an object with the current score
  // TODO: update game object with score
  let updatedData = {};

  try {
    //get gameData
    const query = { roomCode: turnOptions.roomCode };

    let docs = await getGameData(turnOptions.roomCode);

    // check if game is over
    if (docs.gameOver) {
      return { error: `Move Attempted when game was over! ${docs.winner} has won!` };
    }

    console.log('==========DOCS============');
    console.log(docs);
    console.log('========END DOCS========');
    // game logic:
    docs = UpdateDocs(turnOptions, docs);

    console.log('========NEW DOCS========');
    console.log(docs);
    console.log('========END DOCS========');

    // now update the database
    await Game.findOneAndUpdate(query, docs);

    // then, set updatedData with the data we want to return
    updatedData = {
      roomCode: turnOptions.roomCode,
      p1Points: docs.p1Points,
      p1Uses: docs.p1Uses,
      p2Points: docs.p2Points,
      p2Uses: docs.p2Uses,
      winner: docs.winner,
      gameOver: docs.gameOver,
    };
  } catch (err) {
    console.log(err);
    return { error: 'Error updating game!' }; // doesn't return a status because this is called from a socket
  }

  // now, return the new data
  return updatedData;
};
module.exports.handleGameLogic = handleGameLogic;

const getGameData = async (roomCode) => {

    try {
        // get the game's data
        const query = { roomCode: roomCode };
        let docs = await Game.find(query).select(
            'p1Points p1Uses p2Points p2Uses winner gameOver',
        ).lean().exec();
        return docs[0];
    }
    catch (err) {
        console.log(err);
        return {error:  `Error retreiving game with code ${roomCode}`}
    }
}
module.exports.getGameData = getGameData;


//a function that sees if a game with a given room code exists, and if it's waiting for turn input. 
// If it is, returns that it is and what the turn option was and sets it to no longer be. if it isn't, returns that and sets it to be, storing the turn option
const turnRecieved = async (roomCode, turnOpt) => {
    try {
        const query = {roomCode: roomCode};
        let game = await Game.findOne(query).select("turnOngoing turnOption").lean().exec();

        //we need to return that the game is waiting for a turn.
        if(game.turnOngoing) {
            game.turnOngoing = false;

            await Game.findOneAndUpdate(query, game);

            return {continue: true, opt: game.turnOption};
        } 
        //the game is not waiting for a turn.
        else {
            game.turnOngoing = true;
            game.turnOption = turnOpt;
            
            await Game.findOneAndUpdate(query, game);

            return {continue: false};
        }

    } catch (err) {
        return {error: "Error recieving turn information!"}
    }
}
module.exports.turnRecieved = turnRecieved;

//a function that returns if the game with the given roomCode exists. Can return an error in a JSON object.
const doesGameWithCodeExist = async (roomCode) => {
    try {
        const query = {roomCode: roomCode};
        const game = await Game.findOne(query).lean().exec();

        const gameInfo = {
            game: game,
            exists: game !== null,
        }

        return gameInfo;

    } catch (err) {
        console.log(err)
        return {error: "Error Retrieving game"}
    }
}
module.exports.doesGameWithCodeExist = doesGameWithCodeExist;

const joinPlayerToGame = async (roomCode, player) => {
    try {
        const query = {roomCode: roomCode};
        let game = await Game.findOne(query).lean().exec();

        if(game.player2 === undefined) {
            game.player2 = player;
            await Game.findOneAndUpdate(query, game);
            return;
        } else {
            return {error: 'Error adding player to game - game is full!'}
        }
    } catch (err) {
        console.log(err);
        return {error: 'Error retrieving game'}
    }
}
module.exports.joinPlayerToGame = joinPlayerToGame;

const findAllGamesWithPlayer = async (username) => {

    //first, get account data
    let accID;
    try {
        const accQuery = {username: username};
        accID = await Account.findOne(accQuery).lean().exec();
        accID = accID._id;
    } catch (err) {
        console.log(err);
        return {error: `Error finding user with username ${username}`};
    }

    //now, find games where this user is player 1 OR player 2
    let games;
    try {
        const p1Query = {player1: accID};
        const p2Query = {player2: accID};
        games = await Game.find(p1Query).select('roomCode').lean().exec();
        const p2games = await Game.find(p2Query).select('roomCode').lean().exec();
        games = games.concat(p2games);

    } catch (err) {
        console.log(err);
        return {error: `Error finding games to allow rejoin!`}
    }

    return games;
    
}
module.exports.findAllGamesWithPlayer = findAllGamesWithPlayer;
