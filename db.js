const Sequelize = require('sequelize');
const { STRING } = Sequelize;
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const config = {
  logging: false
};

if(process.env.LOGGING){
  delete config.logging;
}
const db = new Sequelize(
  process.env.DATABASE_URL || 'postgres://localhost/acme_db',
  config
);

const User = db.define('user', {
  username: STRING,
  password: STRING,
}, {
  hooks: {
    async beforeCreate(user) {
      user.password = await bcrypt.hash(user.password, 5);
    }
  }
});

const Note = db.define('note', {
  text: STRING
})

Note.belongsTo(User);
User.hasMany(Note);

// to get the token by jwt.sign function
User.prototype.generateToken = async function() {
  try {
    const token = await jwt.sign({ id: this.id }, process.env.JWT);
    return {token};
  } catch (error) {
    console.error(error);
  }
}

// to get the user if the token is right by jwt.verify function
User.byToken = async(token)=> {
  try {
    // const user = await User.findByPk(token.id);
    // if(user){
    //   return user;
    // }
    const payload = await jwt.verify(token, process.env.JWT);
    if (payload) {
      // find user by payload which contains the user id
      const user = await User.findByPk(payload.id);
      return user;
    }

    const error = Error('bad credentials');
    error.status = 401;
    throw error;
  }
  catch(ex){
    const error = Error('bad credentials');
    error.status = 401;
    throw error;
  }
};

// to get the user if the password is match to the database by bcrypt.compare
User.authenticate = async({ username, password })=> {
  const user = await User.findOne({
    where: {
      username,
    }
  });
  const match = await bcrypt.compare(password, user.password)
  if(match){
    return user
  }
  const error = Error('bad credentials');
  error.status = 401;
  throw error;
};

// another way to write the hook function
// before create the data, change the plain password as hash by bcrypt.hash()
// User.addHook('beforeCreate', async (user) => {
//   if (user.changed('password')) {
//     user.password = await bcrypt.hash(user.password, 5)
//   }
// })

const syncAndSeed = async()=> {
  await db.sync({ force: true });
  const credentials = [
    { username: 'lucy', password: 'lucy_pw'},
    { username: 'moe', password: 'moe_pw'},
    { username: 'larry', password: 'larry_pw'}
  ];
  const [lucy, moe, larry] = await Promise.all(
    credentials.map( credential =>  User.create(credential))
  );
  const notes = [
    { text: "hello world" },
    { text: "reminder to buy groceries" },
    { text: "reminder to do laundry" },
  ];
  const [note1, note2, note3] = await Promise.all(
    notes.map(note => Note.create(note))
  );
  await lucy.setNotes(note1);
  await moe.setNotes([note2, note3]);

  return {
    users: {
      lucy,
      moe,
      larry
    }
  };
};

module.exports = {
  syncAndSeed,
  models: {
    User,
    Note
  }
};
