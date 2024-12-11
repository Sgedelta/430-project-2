const controllers = require('./controllers');
const mid = require('./middleware');

const router = (app) => {
  app.get('/getDomos', mid.requiresLogin, controllers.Domo.getDomos);
  app.get('/getAllUsernames', mid.requiresLogin, controllers.Account.getAllAccountNames);

  app.get('/login', mid.requiresSecure, mid.requiresLogout, controllers.Account.loginPage);
  app.post('/login', mid.requiresSecure, mid.requiresLogout, controllers.Account.login);

  app.post('/signup', mid.requiresSecure, mid.requiresLogout, controllers.Account.signup);

  app.post('/changePass', mid.requiresSecure, mid.requiresLogin, controllers.Account.attemptChangePassword);
  app.post('/togglePremium', mid.requiresSecure, mid.requiresLogin, controllers.Account.togglePremium);
  app.post('/isPremium', mid.requiresLogin, controllers.Account.isPremium);

  app.get('/logout', mid.requiresLogin, controllers.Account.logout);
  app.get('/game', mid.requiresLogin, controllers.Game.gamePage);
  app.post('/trade', mid.requiresLogin, controllers.Domo.tradeDomo);
  app.get('/', mid.requiresSecure, mid.requiresLogout, controllers.Account.loginPage);
};

module.exports = router;
