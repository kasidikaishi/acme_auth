const express = require('express');
const app = express();
app.use(express.json());
const { models: { User, Note }} = require('./db');
const path = require('path');

app.get('/', (req, res)=> res.sendFile(path.join(__dirname, 'index.html')));

const requireToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization;
    // to verify the token is right or wrong by User.byToken function -
    // - jwt.verify(token, process.env.JWT) to get the payload -
    // - if it's right, the function will return the user
    // so User.byToken will get the user is the token is right.
    const user = await User.byToken(token);
    req.user = user;
    next();
  } catch (error) {
    next(error)
  }
}

app.post('/api/auth', async(req, res, next)=> {
  try {
    // to get the user which its password match the database password
    const user = await User.authenticate(req.body);
    if (!user) res.sendStatus(404);

    // to get the token by jwt.sign in user.generateToken function
    // the token contains user's id information
    const token = await user.generateToken();
    res.send(token)
  }
  catch(ex){
    next(ex);
  }
});

app.get('/api/auth', requireToken, async (req, res, next)=> {
  try {
    if (req.user) {
      res.send(req.user);
    } else {
      res.sendStatus(404);
    }

  }
  catch(ex){
    next(ex);
  }
});

app.get('/api/users/:id/notes', requireToken, async (req, res, next) => {
  try {
    // if my token id is 1, and my api request is
    // /api/users/2/notes
    // this will previously pass, when it should fail

    // here, req.params.id is not a number
    // we could use != or Number() to compare the two id
    if (req.user.id != req.params.id) {
      throw new Error('Unauthorized');
    }
    const userNotes = await Note.findAll({
      where: {
        userId: req.params.id
      }
    });
    res.send(userNotes);
  } catch (error) {
    next(error)
  }
})

app.use((err, req, res, next)=> {
  console.log(err);
  res.status(err.status || 500).send({ error: err.message });
});

module.exports = app;
