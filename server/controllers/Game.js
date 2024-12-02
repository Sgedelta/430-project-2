const models = require('../models');

const { Game } = models;

const gamePage = async (req, res) => res.render('app');
module.exports.gamePage = gamePage;

const startGame = async (req, res) => {


    
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



};
module.exports.startGame = startGame;


const handleGameLogic = async (turnOptions) => {

    //TODO: handle game logic and then return an object with the current score
    //TODO: update game object with score
    let updatedData = {};


    try {
        const query = {roomCode: turnOptions.roomCode};
        let docs = await Game.find(query).select('p1Points p1Uses p2Points p2Uses winner gameOver').lean().exec();
        
        //game logic:
        updateDocs(turnOptions, docs);

        //now update the database
        await Game.findOneAndReplace(query, docs)

        //then, set updatedData with the data we want to return
        updatedData = {
            p1Points: docs.p1Points,
            p1Uses: docs.p1Uses,
            p2Points: docs.p2Points,
            p2Uses: docs.p2Uses,
            winner: docs.winner,
            gameOver: docs.gameOver,
        }


    } catch (err) {
        console.log(err);
        return {error: "Error updating game!"}; //doesn't return a status because this is called from a socket
    }

    //now, return the new data
    return updatedData;

}
module.exports.handleGameLogic = handleGameLogic;


const updateDocs = (turnOptions, docs) => {
    //process p1
    switch(turnOptions.p1Opt) {
        case "gain":
            docs.plPoints += 1;
            break;

        case "setback":
            if(turnOptions.p2Opt === "gain") {
                docs.p2Points -= 1;
            } else if(turnOptions.p2Opt === "setback") {
                docs.p1Points -= 1;
                docs.p2Points -= 1;
            }
            break;
        
        case "rest":
            docs.p1Uses = {
                exp_gain: 1,
                reset: 1,
                sacrifice: 2,
                steal: 2,
            };
            break;

        case "exp_gain":
            docs.p1Points += 2;
            docs.p1Uses.exp_gain -= 1;
            break;

        case "sacrifice":
            docs.p1Points -= 1;
            docs.p2Points -= 2;
            docs.p1Uses.sacrifice -= 1;
            break;

        case "steal":
            docs.p2Points -= 1;
            docs.p1Points += 1;
            docs.p1Uses.steal -= 1;
            break;
    }

    //process p2 (same as p1 but switch p1 and p2)
    switch(turnOptions.p2Opt) {
        case "gain":
            docs.p2Points += 1;
            break;

        case "setback":
            if(turnOptions.p1Opt === "gain") {
                docs.p1Points -= 1;
            } else if(turnOptions.p1Opt === "setback") {
                docs.p2Points -= 1;
                docs.p1Points -= 1;
            }
            break;
        
        case "rest":
            docs.p2Uses = {
                exp_gain: 1,
                reset: 1,
                sacrifice: 2,
                steal: 2,
            };
            break;

        case "exp_gain":
            docs.p2Points += 2;
            docs.p2Uses.exp_gain -= 1;
            break;

        case "sacrifice":
            docs.p2Points -= 1;
            docs.p1Points -= 2;
            docs.p2Uses.sacrifice -= 1;
            break;

        case "steal":
            docs.p1Points -= 1;
            docs.p2Points += 1;
            docs.p2Uses.steal -= 1;
            break;
    }


    //handle reset AFTER other things, because it needs points to be gained first.
    if(turnOptions.p1Opt === "reset") {
        if(docs.p1Points >= 4 && docs.p2Points >= 4) {
            docs.p1Points = 0;
            docs.p2Points = 0;
            if(turnOptions.p2Opt !== "reset") {
                docs.p1Points = 1;
            }
        }
        docs.p1Uses.reset -= 1;
    
    }
    if(turnOptions.p2Opt === "reset") {
        if(docs.p1Points >= 4 && docs.p2Points >= 4) {
            docs.p1Points = 0;
            docs.p2Points = 0;
            if(turnOptions.p1Opt !== "reset") {
                docs.p2Points = 1;
            }
        }
        docs.p2Uses.reset -= 1;
    
    }

    if(docs.p1Points < 0) {
        docs.p1Points = 0;
    }
    if(docs.p2Points < 0) {
        docs.p2Points = 0;
    }
    if(docs.p1Points >= 5 && docs.p2Points >= 5) {
        docs.p1Points = 4;
        docs.p2Points = 4;
    }

    if(docs.p1Points >= 5) {
        docs.winner = "Player 1";
        gameOver = true;
    } else if (docs.p2Points >= 5) {
        docs.winner = "Player 2";
        gameOver = true;
    }

    return docs;
}