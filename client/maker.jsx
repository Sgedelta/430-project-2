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

    turnForm.disabled = !val;

};

const TurnForm = (props) => {
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
                    <input type="checkbox" disabled="true" id="exp_gain_use" />
                    <input type="radio" id="exp_gain" class="turnInput" name="turn_option" value="exp_gain"/> Expert Gain
                </label>

                <label htmlFor="reset">
                    <input type="checkbox" disabled="true" id = "reset_use" />
                    <input type="radio" id="reset" class="turnInput" name="turn_option" value="reset"/> Reset
                </label>

                <label htmlFor="sacrifice">
                    <input type="checkbox" disabled="true" id = "sacrifice_use" /> <input type="checkbox" disabled="true" id = "sacrifice_use2"/>
                    <input type="radio" id="sacrifice" class="turnInput" name="turn_option" value="sacrifice"/> Sacrifice
                </label>

                <label htmlFor="steal">
                    <input type="checkbox" disabled="true" id = "steal_use"/> <input type="checkbox" disabled="true" id = "steal_use2"/>
                    <input type="radio" id="steal" class="turnInput" name="turn_option" value="steal"/> Steal
                </label>
            </ul>   

            <input className="makeDomoSubmit" type="submit" value = "Submit Turn" />
            
            </fieldset>
        </form>
    );
}

const PointDisplay = (props) => {

    return(
        <fieldset id="pointDisplay" disabled="true">

            <div id="ourPoints">
                <input type="checkbox" /> <input type="checkbox" /> <input type="checkbox" /> <input type="checkbox" /> <input type="checkbox" />
            </div>

            <div id="otherPoints">
                <input type="checkbox" /> <input type="checkbox" /> <input type="checkbox" /> <input type="checkbox" /> <input type="checkbox" />
            </div>


        </fieldset>
    );

};


const updateDisplayAfterTurn = (gameResult) => {

    console.log(gameResult);

    //get the things we will be updating
    const ourPoints = document.querySelector("#ourPoints").children;
    const otherPoints = document.querySelector("#otherPoints").children;
    const expGainUse = document.querySelector("#exp_gain_use");
    const resetUse = document.querySelector("#reset_use");
    const sacrificeUses = [
        document.querySelector("#sacrifice_use"),
        document.querySelector("#sacrifice_use2"),
    ];
    const stealUses = [
        document.querySelector("#steal_use"),
        document.querySelector("#steal_use2"),
    ];

    //update points and uses
    
        //points - assume we are p1 for now. TODO
    for(let i = 0; i < 5; ++i) {
        ourPoints[i].checked = gameResult.p1Points > i;
        otherPoints[i].checked = gameResult.p2Points > i;
    }

        //uses - not handling other uses for now. because they are not in the place TODO
    for(let i = 0; i < 2; ++i) {
        sacrificeUses[i].checked = gameResult.p1Uses.sacrifice <= i;
    }
    for(let i = 0; i < 2; ++i) {
        stealUses[i].checked = gameResult.p1Uses.steal <= i;
    }
    
    expGainUse.checked = gameResult.p1Uses.exp_gain === 1;
    resetUse.checked = gameResult.p1Uses.reset === 1;

};

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


const App = () => {
    const [reloadDomos, setReloadDomos] = useState(false);

    return (
        <div>
            <PointDisplay />
            <TurnForm />
        </div>
    );
};

const init = () => {
    const root = createRoot(document.getElementById('app'));
    root.render(<App />);


    
    //socket setup:
    
    socket.on('TurnComplete', (gameResult) => {
        console.log(gameResult);
        updateDisplayAfterTurn(gameResult);
        
        //tell the turn to be over
        waiting = false;
    });
    //handle errors we get back from socket
    socket.on('ErrorChannel', (err) => {
        console.log(err);
        //Display Error:
        // TODO: DISPLAY ERROR FUNCTION UPDATE
        helper.handleError(err);
    })
    //set our game data to the room code and that we are player one
    socket.on('JoinGame', (roomCode) => setGameInfo({roomCode: roomCode, player: 0}));    

}

window.onload = init;
