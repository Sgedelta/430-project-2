const helper = require('./helper.js');
const React = require('react');
const socket = io();

const {useState, useEffect} = React;
const {createRoot} = require('react-dom/client');

//TODO: break things out into seperate files?


//a function that sets our local information to that of a given game's
const setGameInfo = (roomInfo) => {
    localStorage.setItem("gameRoomCode", roomInfo.roomCode);
    if(roomInfo.player) {
        localStorage.setItem("gamePlayerValue", roomInfo.player);
    }
}

let waiting = false;

const handleTurn = async (e) => {
    e.preventDefault();

    const turnOption = document.querySelector('input[name="turn_option"]:checked');

    if(!turnOption) {
        //the player did not select something. They need to do that - display an error.
        helper.handleError("No Turn Option Selected!");

        return;
    }

    const turnInfo = {
        val: turnOption.value,
        player: localStorage.getItem("gamePlayerValue"),
        room: localStorage.getItem("gameRoomCode"),
    }
    //send our turn selection to the server
        //TODO: replace with room info
    socket.emit('TurnSent', turnInfo);
    
    //enter a waiting mode
    waiting = true;
    setTurnFormEnabled(false); //stop people from inputting

    //check every 100ms to see if we are not waiting anymore
    while (waiting) {
        await new Promise((resolve) => setTimeout(resolve, 100)); 
    }


    //at the end of handling things, uncheck the value of inputs, let more input
    setTurnFormEnabled(true);
    turnOption.checked = false;

}

const setTurnFormEnabled = (val) => {

    const turnForm = document.querySelector("#turnInputWrapper");

    if(turnForm)
        turnForm.disabled = !val;

    localStorage.setItem('gameTurnFormDisabled', !val);

};

const TurnForm = (props) => {


    //grab some things 
    let data = props.gameState;



    const player = localStorage.getItem('gamePlayerValue');
    let disabled = localStorage.getItem('gameTurnFormDisabled');
    if(disabled === null) {
        disabled = false;
    }
    let uses;

    //ignore if they do not give props, or if the player data is not there
    if(data === null || !data.p1Uses || !data.p2Uses) {

        //reload after a delay
        props.reload();

        //return nothing in the mean time
        return(<div>Game Loading...</div>);
    }


    if(player === 0) {
        uses = data.p1Uses;
    } else {
        uses = data.p2Uses;
    }

    

    return(
        <form 
        id = "turnForm" name = "turnForm"
        onSubmit={(e) => handleTurn(e)}
        action="/completeTurn"
        method="POST"
        className = "turnForm"
        >
            <fieldset id="turnInputWrapper" disabled = {disabled}>
            <h1>Basic Actions</h1>
            <ul>
                <label htmlFor="gain"><input type="radio" id="gain" class="turnInput" name="turn_option" value="gain" /> Gain</label>
                <label htmlFor="setback"><input type="radio" id="setback" class="turnInput" name="turn_option" value="setback"/> Setback</label>
                <label htmlFor="rest"><input type="radio" id="rest" class="turnInput" name="turn_option" value="rest"/> Rest</label>
            </ul>
            <h1>Special Actions</h1>         
            <ul>
                <label htmlFor="exp_gain">
                    <input type="checkbox" disabled="true" id="exp_gain_use"  checked={uses.exp_gain < 1}/>
                    <input type="radio" id="exp_gain" class="turnInput" name="turn_option" value="exp_gain" disabled = {uses.exp_gain < 1}/> Expert Gain
                </label>

                <label htmlFor="reset">
                    <input type="checkbox" disabled="true" id = "reset_use"  checked={uses.reset < 1}/>
                    <input type="radio" id="reset" class="turnInput" name="turn_option" value="reset" disabled = {uses.reset < 1}/> Reset
                </label>

                <label htmlFor="sacrifice">
                    <input type="checkbox" disabled="true" id = "sacrifice_use"  checked={uses.sacrifice < 1}/> <input type="checkbox" disabled="true" id = "sacrifice_use2" checked={uses.sacrifice < 2}/>
                    <input type="radio" id="sacrifice" class="turnInput" name="turn_option" value="sacrifice" disabled = {uses.sacrifice < 1} /> Sacrifice
                </label>

                <label htmlFor="steal">
                    <input type="checkbox" disabled="true" id = "steal_use" checked={ uses.steal < 1}/> <input type="checkbox" disabled="true" id = "steal_use2" checked={uses.steal < 2}/>
                    <input type="radio" id="steal" class="turnInput" name="turn_option" value="steal" disabled = {uses.steal < 1 }/> Steal
                </label>
            </ul>   

            <input type="submit" value = "Submit Turn" />
            
            </fieldset>
        </form>
    );
}

const PointDisplay = (props) => {

    let data = props.gameState;

    //we don't have data yet, wait for reload to be triggered by game form
    if(data === null ) {
        return (
            <div id="pointDisplay">Points Loading!</div>
        );
    }

    const player = localStorage.getItem('gamePlayerValue');
    console.log(`player is ${player}`)
    let ourPoints;
    let otherPoints;
    
    if(player === 0) {
        ourPoints = data.p1Points;
        otherPoints = data.p2Points;
    } else {
        ourPoints = data.p2Points;
        otherPoints = data.p1Points;
    }

    return(
        <fieldset id="pointDisplay" disabled="true">

            <div id="ourPoints">
                <span class="pointLabel"> Your Points: </span>
                <input type="checkbox" checked = {ourPoints >= 1}/> 
                <input type="checkbox" checked = {ourPoints >= 2}/> 
                <input type="checkbox" checked = {ourPoints >= 3}/> 
                <input type="checkbox" checked = {ourPoints >= 4}/> 
                <input type="checkbox" checked = {ourPoints >= 5}/>
            </div>

            <div id="otherPoints">
                <span class="pointLabel"> Other Player's Points: </span>
                <input type="checkbox" checked = {otherPoints >= 1}/> 
                <input type="checkbox" checked = {otherPoints >= 2}/> 
                <input type="checkbox" checked = {otherPoints >= 3}/> 
                <input type="checkbox" checked = {otherPoints >= 4}/> 
                <input type="checkbox" checked = {otherPoints >= 5}/>
            </div>


        </fieldset>
    );

};

//a component that displays the OTHER player's uses.
const UseDisplay = (props) => {

    let data = props.gameState;

    //we don't have data yet, wait for reload to be triggered by game form
    if(data === null) {
        return (
            <div id="useDisplay">Uses Loading!</div>
        );
    }

    const player = localStorage.getItem('gamePlayerValue');
    let uses;
    
    if(player === 0) {
        uses = data.p1Uses;
    } else {
        uses = data.p2Uses;
    }

    //we don't have uses data - we can't do this in point display because they default to 0 (numbers)
    if(!uses) {
        uses = {};
    }

    return(
        <fieldset id="useDisplay" disabled="true">
            <label htmlFor="exp_gain">
                <input type="checkbox" disabled="true" id="exp_gain_use"  checked={uses.exp_gain < 1}/>
                Expert Gain
            </label>

            <label htmlFor="reset">
                <input type="checkbox" disabled="true" id = "reset_use"  checked={uses.reset < 1}/>
                Reset
            </label>

            <label htmlFor="sacrifice">
                <input type="checkbox" disabled="true" id = "sacrifice_use"  checked={uses.sacrifice < 1}/> <input type="checkbox" disabled="true" id = "sacrifice_use2" checked={uses.sacrifice < 2}/>
                Sacrifice
            </label>

            <label htmlFor="steal">
                <input type="checkbox" disabled="true" id = "steal_use" checked={ uses.steal < 1}/> <input type="checkbox" disabled="true" id = "steal_use2" checked={uses.steal < 2}/>
                Steal
            </label>
        </fieldset>
    );

};

const RoomCodeDisplay = (props) => {

    const [roomCode, setRoomCode] = useState('');
    useEffect(() => {
        setRoomCode(localStorage.getItem('gameRoomCode'));
    })
    

    if(roomCode === null || roomCode === '') {
        roomCode = "Room Code Not Found!"
    }


    return (
        <div id = "roomCodeDisplay">

            <h3>Room Code: {roomCode}</h3>


        </div>
    );
}

const StartGameButton = (props) => {
    return(
        <form id="makeNewGameForm"
        onSubmit={(e) => {
            e.preventDefault();
            socket.emit('CreateNewGame');
        }}>

            <input type="submit" value = "Make New Game" />

        </form>
    );
}

const JoinGameButton = (props) => {

    const [roomCode, setRoomCode] = useState('');

    return(
        <form id="joinGameForm"
        onSubmit={(e) => {
            e.preventDefault();
            socket.emit('RequestJoin', roomCode);
        }}>
            <label htmlFor="roomCodeInput">Enter Room Code: </label>
            <input type="text" id="roomCodeInput" 
            value={roomCode} onChange={e=> setRoomCode(e.target.value)}/>
            <input type="submit" value = "Join Game" />

        </form>
    );
}

const LeaveCurrentRoomButton = (props) => {

    return(
        <form id="leaveGameForm"
        onSubmit={(e) => {
            e.preventDefault();
            localStorage.removeItem('gameRoomCode');
            localStorage.removeItem('gamePlayerValue');
            localStorage.removeItem('gameTurnFormDisabled');
            props.setInGame(false);
        }}
        >
            <input type="submit" value = "Leave Current Room" />
        </form>
    );

};

const GameList = (props) => {
    const [games, setGames] = useState(props.games);

    useEffect(() => {
        const loadGamesFromServer = async () => {
            let res = await fetch('getAllGames');
            const data = await res.json();
            setGames(data);
        };
        loadGamesFromServer();
    }, [props.reloadGames]);

    if(games.length === 0) {
        return (
            <div id="gameList">
                <h3>No Games Stored!</h3>
            </div>
        )
    }

    const gameNodes = games.map(game => {
        return (
            <div key={game.id} className = "game">
                <h3 className = "gameInfoPiece">Room Code: {game.roomCode}</h3>
                <h3 className = "gameInfoPiece">
                    {game.gameOver && <span>Game Is Over! </span>}
                    {!game.gameOver && <span>Game is Ongoing! </span>}
                    {game.gameOver && 
                        ((game.thisPlayerIs === 0 && game.winner === 'Player 1') || (game.thisPlayerIs === 1 && game.winner === 'Player 2')) 
                        && <span>You've Won!</span>}
                    {game.gameOver && ((game.thisPlayerIs === 0 && game.winner === 'Player 2') || (game.thisPlayerIs === 1 && game.winner === 'Player 1')) 
                    && <span>You've Lost :[ </span>}
                </h3>
                <h3 className = "gameInfoPiece">You Are: Player {game.thisPlayerIs + 1}</h3>
                <h3 className = "gameInfoPiece">Player One Points: {game.p1Points}</h3>
                <h3 className = "gameInfoPiece">Player Two Points: {game.p2Points} </h3>
            </div>
        );
    });

    return (
        <div className = "gameList">
            <h3>Your Games: </h3>
            <div className = "gameFlex"> {gameNodes} </div>

        </div>
    )
};

const GameSelectionComponents = (props) => {
    

    return (
        <div id="gameSelectionWrapper">
            <StartGameButton setInGame = {props.setInGame}/>
            <JoinGameButton setInGame = {props.setInGame} />
        </div>
    );
}

const GameplayComponents = (props) => {

    const [gameState, setGameState] = useState({});
    const [reloadState, setReloadState] = useState(0); 
    const reloadToggle = async () => 
        {
            //wait .5 second then force a rerender
            if(reloadState % 5 === 0) {
                socket.emit('RequestGameState', localStorage.getItem('gameRoomCode'));
            }
            await new Promise((resolve) => setTimeout(resolve, 500));
            setReloadState(reloadState+1);
        };

    useEffect(() => {
        socketSubscriptions(setGameState, props.setInGame);
    }); 

    return (
        <div id="gameplayWrapper">
            <div id="gameplayTopBar">
                <PointDisplay gameState = {gameState}/>
                <RoomCodeDisplay />
                <UseDisplay gameState = {gameState}/>
            </div>
            <TurnForm gameState = {gameState} reload = {reloadToggle}/>
            <LeaveCurrentRoomButton setInGame = {props.setInGame} />
        </div>
    );
}


const App = (props) => {

    const [inGame, setInGame] = useState(localStorage.getItem('gameRoomCode') !== null);
    const isPremium = localStorage.getItem('appIsPremium') === "true";
    const [reloadGames, setReloadGames] = useState(false);

    if(inGame) {
        return (
            <div>
                <GameplayComponents setInGame = {setInGame}/>
                <AdSpace display={!isPremium} />
            </div>
        );
    } else {
        return (
            <div> 
                <GameSelectionComponents setInGame = {setInGame}/>
                <GameList games = {[]} reloadGames = {reloadGames}/>
                <AdSpace display={!isPremium} />
            </div>
        );
    }


    
};





const socketFirstTime = () => {
    socketSubscriptions();

    //additional firstTime setup
     if(localStorage.getItem('gameRoomCode') !== null) {
        socket.emit('RequestGameState', localStorage.getItem('gameRoomCode'));
    }
};

const socketSubscriptions = (setGameState, setInGame) => {
    //first, reset old listeners
    socket.off('TurnComplete');
    socket.off('SetInfo');
    socket.off('ErrorChannel');
    socket.off('JoinGame');


    //now, make new listeners
    socket.on('TurnComplete', (gameResult) => {
        if(setGameState) 
            setGameState(gameResult);
        

        //tell the turn to be over
        waiting = false;
    });
    socket.on('SetInfo', (gameResult) => {
        
        if(setGameState)
            setGameState(gameResult);
    });
    //handle errors we get back from socket
    socket.on('ErrorChannel', (err) => {
        console.log(err);
        //Display Error:
        helper.handleError(err);
    })
    //set our game data to the room code and that we are player one
    socket.on('JoinGame', (joinInfo) => {
        
        if(joinInfo)
            setGameInfo({roomCode: joinInfo.roomCode, player: joinInfo.player});
        
        socket.emit('RequestGameState', joinInfo.roomCode);

        if(setInGame)
            setInGame(true);
    
    });
    
};


//PASSWORD CHANGE REGION

const handlePassChange = (e) => {
    e.preventDefault();
    helper.hideError();

    const username = e.target.querySelector('#user').value;
    const pass = e.target.querySelector('#pass').value;
    const newPass = e.target.querySelector('#newPass').value;
    const newPass2 = e.target.querySelector('#newPass2').value;

    if(!username || !pass || !newPass || !newPass2) {
        helper.handleError('All fields are requried!');
        return false;
    }

    if(newPass !== newPass2) {
        helper.handleError('Passwords do not match!');
        return false;
    }

    helper.sendPost(e.target.action, {username, pass, newPass, newPass2});
    return false;
};

const PassChangeWindow = (props) => {
    return (
        <form id="passChangeForm"
            name = "passChangeForm"
            onSubmit={handlePassChange}
            action="/changePass"
            method="POST"
            className="mainForm"
        >
            <label htmlFor="username">Username: </label>
            <input id="user" type="text" name="username" placeholder="username" />
            <label htmlFor="pass">Old Password: </label>
            <input id="pass" type="password" name="pass" placeholder="old password" />
            <label htmlFor="newPass">New Password: </label>
            <input id="newPass" type="password" name="newPass" placeholder="new password" />
            <label htmlFor="newPass2">New Password: </label>
            <input id="newPass2" type="password" name="newPass2" placeholder="retype new password" />
            <input className="formSubmit" type="submit" value = "Change Password" />
        </form>
    );
}

//END PASSWORD CHANGE REGION

//AD / PROFIT REGION

const AdSpace = (props) => {

    if(props.display) {
        return false;
    }

    return (
        <div id="bannerAd">
            Your Advertisement Here! Or: Enable Premium Mode!
        </div>
    );
}


//END AD / PROFIT REGION


const init = () => {
    const gameButton = document.getElementById('mainPageButton');
    const changePassButton = document.getElementById('changePassButton');
    const premiumButton = document.getElementById('premiumButton');

    const root = createRoot(document.getElementById('app'));

    gameButton.addEventListener('click', (e) => {
        e.preventDefault();
        root.render(<App />);
        return false;
    });

    changePassButton.addEventListener('click', (e) => {
        e.preventDefault();
        root.render(<PassChangeWindow />);
        return false;
    });

    //rerender app on click
    premiumButton.addEventListener('click', (e) => {
        e.preventDefault();

        //send the post
        helper.sendPost('/togglePremium', {}, (res) => {
            localStorage.setItem('appIsPremium', res.isPremium);
            root.render(<App />);
        });
        return false;
    });

    root.render(<App />);
    
    //socket setup:
    socketFirstTime();
    
    helper.sendPost('/isPremium', {}, (res) => {
        localStorage.setItem('appIsPremium', res.isPremium);
    });
    
}

window.onload = init;
