const helper = require('./helper.js');
const React = require('react');
const socket = io();

const {useState, useEffect} = React;
const {createRoot} = require('react-dom/client');


//here for reference atm TODO: delete
const handleDomo = (e, onDomoAdded) => {
    e.preventDefault();
    helper.hideError();

    const name = e.target.querySelector("#domoName").value;
    const age = e.target.querySelector("#domoAge").value;

    if(!name || !age) {
        helper.handleError('All fields are required!');
        return false;
    }

    helper.sendPost(e.target.action, {name, age}, onDomoAdded);
    return false;
};

//a function that tells the server to create a game and joins it as player 1
const requestNewGame = () => {
    socket.emit('CreateNewGame');
};

//a function that attempts to join or rejoin a given game (by room code) 
const requestJoinGame = (roomCode) => {
    socket.emit('RequestJoin', roomCode);
}

//a function that sets our local information to that of a given game's
const setGameInfo = (roomInfo) => {
    console.log("setting game info: ");
    console.log(roomInfo);
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
        //TODO: display error

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

};

const TurnForm = (props) => {



    let data = props.gameState;
    const player = localStorage.getItem('gamePlayerValue');
    let uses;


    //ignore if they do not give props, or if the player data is not there
    if(!data.p1Uses || !data.p2Uses || player === null) {
        return(<div></div>);
    }

    console.log(player);

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
            <fieldset id="turnInputWrapper">
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

            <input className="makeDomoSubmit" type="submit" value = "Submit Turn" />
            
            </fieldset>
        </form>
    );
}

const PointDisplay = (props) => {

    let data = props.gameState;

    const player = localStorage.getItem('gamePlayerValue');
    console.log(`player is ${player}`)
    let ourPoints;
    let otherPoints;
    console.log(player);
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
                <input type="checkbox" checked = {ourPoints >= 1}/> 
                <input type="checkbox" checked = {ourPoints >= 2}/> 
                <input type="checkbox" checked = {ourPoints >= 3}/> 
                <input type="checkbox" checked = {ourPoints >= 4}/> 
                <input type="checkbox" checked = {ourPoints >= 5}/>
            </div>

            <div id="otherPoints">
                <input type="checkbox" checked = {otherPoints >= 1}/> 
                <input type="checkbox" checked = {otherPoints >= 2}/> 
                <input type="checkbox" checked = {otherPoints >= 3}/> 
                <input type="checkbox" checked = {otherPoints >= 4}/> 
                <input type="checkbox" checked = {otherPoints >= 5}/>
            </div>


        </fieldset>
    );

};

const StartGame = async (e) => {

    e.preventDefault();

    socket.emit('CreateNewGame');
}

const StartGameButton = (props) => {
    return(
        <form id="makeNewGameForm"
        onSubmit={(e) => StartGame(e)}>

            <input type="submit" value = "Make New Game" />

        </form>
    );
}

const JoinGame = async (e) => {
    e.preventDefault();

    const code = document.querySelector("#roomCodeInput").value;

    socket.emit('RequestJoin', code);
}

const JoinGameButton = (props) => {
    return(
        <form id="joinGameForm"
        onSubmit={(e) => JoinGame(e)}>
            <label htmlFor="roomCodeInput">Enter Room Code: </label><input type="text" id="roomCodeInput"/>
            <input type="submit" value = "Join Game" />

        </form>
    );
}

//here for reference atm TODO: delete
const handleTrade = async (e, onTradeCompleted) => {
    e.preventDefault();
    helper.hideError();

    const name = document.querySelector("#domoTradeName").value;
    const otherUser = document.querySelector("#otherUser").value;

    //make sure we have name and another user
    if(!name || !otherUser) {
        helper.handleError("All fields required!");
        return false;
    }

    //make sure that we have a domo with that name 
    const ourDomos = await fetch('/getDomos');
    const domoData = await ourDomos.json();
    const filteredDomos = domoData.domos.filter((domo) => domo.name === name);

    if(filteredDomos.length === 0) {
        helper.handleError("No Domo with that name!");
        return false;
    }

    const otherUsers = await fetch('/getAllUsernames');
    const usernameData = await otherUsers.json();
    const filteredUsers = usernameData.accounts.filter((user) => user === otherUser)

    if(filteredUsers.length === 0) {
        helper.handleError("No User with that Username found!");
        return false;
    }

    const filteredDomoData = filteredDomos[0];
    const filteredUser = filteredUsers[0];


    helper.sendPost(e.target.action, {filteredDomoData, filteredUser}, onTradeCompleted);
    return false;
};

//here for reference atm TODO: delete
const TradeForm = (props) => {
    return(
        <form id="tradeForm"
        name = "tradeForm"
        onSubmit={(e) => handleTrade(e, props.triggerReload)}
        action="/trade"
        method="POST"
        className="tradeForm"
        >
            <label htmlFor="name">Domo Name: </label>
            <input id="domoTradeName" type="text" name="name" placeholder="Domo Name" />
            <label htmlFor="otherUser">Trade To: </label>
            <input id="otherUser" type="text" name="otherUser" placeholder="Other User" />
            <input className="tradeDomoSubmit" type="submit" value="Trade Domo" />

        </form>
    );
};

//here for reference atm TODO: delete
const DomoList = (props) => {
    const [domos, setDomos] = useState(props.domos);

    useEffect(() => {
        const loadDomosFromServer = async () => {
            const response = await fetch('/getDomos');
            const data = await response.json();
            setDomos(data.domos);
        };
        loadDomosFromServer();
    }, [props.reloadDomos]);

    if(domos.length === 0) {
        return(
            <div className="domoList">
                <h3 className="emptyName">No Domos Yet!</h3>
            </div>
        );
    }

    const domoNodes = domos.map(domo => {
        return (
            <div key={domo.id} className="domo">
                <img src="/assets/img/domoface.jpeg" alt="domo face" className="domoFace" />
                <h3 className="domoName">Name: {domo.name}</h3>
                <h3 className="domoTraded">Times Traded: {domo.timesTraded}</h3>
                <h3 className="domoAge">Age: {domo.age}</h3>
            </div>
        );
    });

    return (
        <div className="domoList">
            {domoNodes}
        </div>
    );
};


const App = (props) => {
    // use State/react data to know if we need to render start/join/game list 
    //  or if we need to load pointDisplay/Turn Form/etc
    const [reloadDomos, setReloadDomos] = useState(false);
    const [gameState, setGameState] = useState({});

    useEffect(() => {
        socketSubscriptions(setGameState);
    });


    return (
        <div>
            <StartGameButton />
            <JoinGameButton />
            <PointDisplay gameState = {gameState}/>
            <TurnForm gameState = {gameState}/>
        </div>
    );
};

const socketFirstTime = () => {
    socketSubscriptions();

    //additional firstTime setup
     if(localStorage.getItem('gameRoomCode') !== null) {
        console.log(`Local Storage Is ${localStorage.getItem('gameRoomCode')}`);

        socket.emit('RequestGameState', localStorage.getItem('gameRoomCode'));
    }
};

const socketSubscriptions = (setGameState) => {
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
        // TODO: DISPLAY ERROR FUNCTION UPDATE
        helper.handleError(err);
    })
    //set our game data to the room code and that we are player one
    socket.on('JoinGame', (joinInfo) => setGameInfo({roomCode: joinInfo.roomCode, player: joinInfo.player}));
    
};


const init = () => {
    const root = createRoot(document.getElementById('app'));

    let gameState = {};
    root.render(<App gameState={gameState}/>);


    
    //socket setup:
    socketFirstTime();
   
    
}

window.onload = init;
