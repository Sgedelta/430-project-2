const models = require('../models');

const { Domo, Account } = models;



const getDomos = async (req, res) => {
  try {
    const query = { owner: req.session.account._id };
    const docs = await Domo.find(query).select('name age timesTraded').lean().exec();

    return res.json({ domos: docs });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: 'Error retrieving Domos!' });
  }
};

const makeDomo = async (req, res) => {
  if (!req.body.name || !req.body.age) {
    return res.status(400).json({ error: 'Both Name and Age are required!' });
  }

  const domoData = {
    name: req.body.name,
    age: req.body.age,
    owner: req.session.account._id,
  };

  try {
    const newDomo = new Domo(domoData);
    await newDomo.save();
    return res.status(201).json({ name: newDomo.name, age: newDomo.age });
  } catch (err) {
    console.log(err);
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Domo already exists!' });
    }
    return res.status(500).json({ error: 'An error occured!' });
  }
};

const tradeDomo = async (req, res) => {
  if (!req.body.filteredUser || !req.body.filteredDomoData) {
    return res.status(400).json({ error: 'Username and Domo Data required!' });
  }

  // find the userid for the user with the name given
  const newUser = await Account.find({ username: req.body.filteredUser }).select('username').lean().exec();

  // make a new domo
  const newDomoData = {
    name: req.body.filteredDomoData.name,
    age: req.body.filteredDomoData.age,
    owner: newUser[0]._id,
    timesTraded: req.body.filteredDomoData.timesTraded + 1,
  };

  try {
    const newDomo = new Domo(newDomoData);

    await Domo.findByIdAndDelete(req.body.filteredDomoData._id);

    await newDomo.save();

    return res.status(201);
  } catch (err) {
    console.log(err);
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Domo already exists!' });
    }
    return res.status(500).json({ error: 'An error occured!' });
  }
};

module.exports = {
  makerPage,
  makeDomo,
  getDomos,
  tradeDomo,
};
