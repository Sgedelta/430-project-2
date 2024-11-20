const helper = require('./helper.js');
const React = require('react');

const {useState, useEffect} = React;
const {createRoot} = require('react-dom/client');

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

const DomoForm = (props) => {
    return(
        <form id="domoForm"
        name = "domoForm"
        onSubmit={(e) => handleDomo(e, props.triggerReload)}
        action="/maker"
        method="POST"
        className="domoForm"
    >
        <label htmlFor="name">Name: </label>
        <input id="domoName" type="text" name="name" placeholder="Domo Name" />
        <label htmlFor="age">Age: </label>
        <input id="domoAge" type="number" name="age" min="0" />
        <input className="makeDomoSubmit" type="submit" value = "Make Domo" />
    </form>
    );
};

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
            <div id="makeDomo">
                <DomoForm triggerReload={()=>setReloadDomos(!reloadDomos)} />
            </div>
            <div id="tradeDomo">
                <TradeForm triggerReload={()=>setReloadDomos(!reloadDomos)} />
            </div>
            <div id="domos">
                <DomoList domos={[]} reloadDomos={reloadDomos} />
            </div>
        </div>
    );
};

const init = () => {
    const root = createRoot(document.getElementById('app'));
    root.render(<App />);
}

window.onload = init;
