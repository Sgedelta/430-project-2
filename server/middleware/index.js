const requiresLogin = (req, res, next) => {
  if (!req.session.account) {
    return res.redirect('/');
  }
  return next();
};
module.exports.requiresLogin = requiresLogin;

const requiresLogout = (req, res, next) => {
  if (req.session.account) {
    return res.redirect('/maker');
  }
  return next();
};
module.exports.requiresLogout = requiresLogout;

const requiresSecure = (req, res, next) => {
  if (req.headers['x-forwarded-proto'] !== 'https') {
    return res.redirect(`https://${req.hostname}${req.url}`);
  }
  return next();
};

const bypassSecure = (req, res, next) => {
  next();
};

if (process.env.NODE_ENV === 'production') {
  module.exports.requiresSecure = requiresSecure;
} else {
  module.exports.requiresSecure = bypassSecure;
}

const requiresGame = (req, res, next) => {
  //assumed logged in

  if(req.session.account) {
    
  }

  return next();
}
