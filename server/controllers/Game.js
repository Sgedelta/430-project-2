const models = require('../models');

const { Game } = models;

const gamePage = async (req, res) => res.render('app');
module.exports.gamePage = gamePage;

const generateRoomCode = async (playerID) => {
  
  // TODO: import a new uuid library to generate room codes.
};

const startGame = async (session) => {
  // temporary version to avoid some issues and not crash the whole thing.

  const newRoomCode = generateRoomCode(session.id);
  const gameData = {
    player1: session.id,
    roomCode: newRoomCode,
  };

  try {
    const newGame = new Game(gameData);
    await newGame.save();
    return res.status(200).json({ message: 'Game Created' }); // temp message?
  } catch (err) {
    console.log(err);
    if (err.code === 11000) {
      return { message: 'duplicate key' };
    }
    return { error: 'Error Starting Game!' };
  }

  /*
    if(!req.session.account) {
        return res.status(400).json({ error: 'Starting player not found.'});
    }

    const gameData = {
        player1: req.session._id,
        roomCode: "TempRoom"//generate a roomcode here based on req session and some random thing?
        //question: How to ensure that this is random and doesn't randomly generate the same thing twice
    };

    try {
        const newGame = new Game(gameData);
        await newGame.save();
        req.session.game = Game.toAPI(newGame);
        return res.status(200).json({message: 'Game Created'}); //temp message?

    } catch (err) {
        console.log(err);
        return res.status(500).json({ error: 'Error Starting Game!'});
    }
    */
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
    // get the game's data
    const query = { roomCode: turnOptions.roomCode };
    let docs = await Game.find(query).select(
      'p1Points p1Uses p2Points p2Uses winner gameOver',
    ).lean().exec();

    // check if game is over
    if (docs[0].gameOver) {
      return { error: `Move Attempted when game was over! ${docs[0].winner} has won!` };
    }

    console.log('==========DOCS============');
    console.log(docs[0]);
    console.log('========END DOCS========');
    // game logic:
    docs = UpdateDocs(turnOptions, docs[0]);

    console.log('========NEW DOCS========');
    console.log(docs);
    console.log('========END DOCS========');

    // now update the database
    await Game.findOneAndUpdate(query, docs);

    // then, set updatedData with the data we want to return
    updatedData = {
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
