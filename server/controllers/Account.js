const models = require('../models');

const { Account } = models;

const loginPage = (req, res) => res.render('login');

const logout = (req, res) => {
  req.session.destroy();
  res.redirect('/');
};

const login = (req, res) => {
  const username = `${req.body.username}`;
  const pass = `${req.body.pass}`;

  if (!username || !pass) {
    return res.status(400).json({ error: 'All Fields are required!' });
  }

  return Account.authenticate(username, pass, (err, account) => {
    if (err || !account) {
      return res.status(401).json({ error: 'Wrong username or password' });
    }

    req.session.account = Account.toAPI(account);

    return res.json({ redirect: '/game' });
  });
};

const signup = async (req, res) => {
  const username = `${req.body.username}`;
  const pass = `${req.body.pass}`;
  const pass2 = `${req.body.pass2}`;

  if (!username || !pass || !pass2) {
    return res.status(400).json({ error: 'All Fields are required!' });
  }

  if (pass !== pass2) {
    return res.status(400).json({ error: 'Passwords do not match!' });
  }

  try {
    const hash = await Account.generateHash(pass);
    const newAccount = new Account({ username, password: hash });
    await newAccount.save();
    req.session.account = Account.toAPI(newAccount);
    return res.json({ redirect: '/game' });
  } catch (err) {
    console.log(err);
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Username already in use!' });
    }
    return res.status(500).json({ error: 'An error occured' });
  }
};

const attemptChangePassword = (req, res) => {
  const username = `${req.body.username}`;
  const pass = `${req.body.pass}`;
  const newPass = `${req.body.newPass}`;
  const newPass2 = `${req.body.newPass2}`;

  if(!username || !pass || !newPass || !newPass2) {
    return res.status(400).json({ error: 'All Fields are Required!'});
  }

  if(newPass !== newPass2) {
    return res.status(400).json({ error: 'Passwords do not match!' });
  }

  return Account.authenticate(username, pass, async (err, account) => {
    if (err || !account) {
      return res.status(401).json({ error: 'Wrong username or password' });
    }

    try {
      const hash = await Account.generateHash(newPass);
      const newData = {password: hash};
      const query = {username: username};
      await Account.findOneAndUpdate(query, newData).lean().exec();

      return res.status(201).json({ message: 'Account Updated'});

    } catch (error) {
      console.log(err);
      return res.status(500).json({ error: 'An error occured'});
    }

  });

};

const togglePremium = async (req, res) => {
  username = req.session.account.username;

  try {
    const query = {username: username};
    let isPremium = await Account.findOne(query).select('isPremium').lean().exec();

    //this is the account object, so we're seeing if we got a response...
    if(!isPremium || isPremium === null) {
      return res.status(500).json({error: 'User not found!'});
    }

    //grab the actual status, now that we know it won't error.
    isPremium = isPremium.isPremium;

    //now, for accounts that aren't tracking it already, add it as true (they are attempting to toggle, default is false)
    if(isPremium === null) {
      isPremium = true;
    } else {
      //otherwise, toggle the state
      isPremium = !isPremium;
    }

    //now update the docs
    await Account.findOneAndUpdate(query, {isPremium: isPremium}).lean().exec();

    return res.status(201).json({isPremium: isPremium});
  } catch(err) {
    console.log(err);
    return res.status(500).json({error: 'Error toggling premium mode'});
  }
};

const isPremium = async (req, res) => {
  username = req.session.account.username;

  try {
    const query = {username: username};
    let isPremium = await Account.findOne(query).select('isPremium').lean().exec();

    //this is the account object, so we're seeing if we got a response...
    if(!isPremium || isPremium === null) {
      return res.status(500).json({error: 'User not found!'});
    }

    //account for accounts that do not know what they are (made before feature)
    if(isPremium.isPremium === null) {
      isPremium.isPremium = false;
    }

    return res.status(200).json(isPremium);

  }  catch(err) {
    console.log(err);
    return res.status(500).json({error: 'Error getting if account is premium'});
  }
}

const getAllAccountNames = async (req, res) => {
  try {
    const query = { };
    const docs = await Account.find(query).select('username').lean().exec();

    const usernameArray = [];

    docs.forEach((user) => {
      usernameArray.push(user.username);
    });

    return res.json({ accounts: usernameArray });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: 'Error retrieving Usernames!' });
  }
};



module.exports = {
  loginPage,
  login,
  logout,
  signup,
  getAllAccountNames,
  attemptChangePassword,
  togglePremium,
  isPremium,

};
