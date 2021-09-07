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
const conn = new Sequelize(process.env.DATABASE_URL || 'postgres://localhost/acme_db', config);

const User = conn.define('user', {
  username: STRING,
  password: STRING,
}, {
  hooks: {
    async beforeCreate(user) {
      const password = user.password;
      const hashed = await bcrypt.hash(password, 5);
      user.password = hashed;
    }
  }
});

User.byToken = async(token)=> {
  try {
    const user = await User.findByPk(token.id);
    if(user){
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

User.authenticate = async({ username, password })=> {
  const user = await User.findOne({
    where: {
      username,
    }
  });
  const hashed = user.password;
  const authenticatePass = await bcrypt.compare(password, hashed)
  if(authenticatePass){
    // return user.id;
    return jwt.sign({ id: user.id }, process.env.JWT)
  }
  const error = Error('bad credentials');
  error.status = 401;
  throw error;
};

const syncAndSeed = async()=> {
  await conn.sync({ force: true });
  const credentials = [
    { username: 'lucy', password: 'lucy_pw'},
    { username: 'moe', password: 'moe_pw'},
    { username: 'larry', password: 'larry_pw'}
  ];

  const [lucy, moe, larry] = await Promise.all(
    credentials.map( credential =>  User.create(credential))
  );
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
    User
  }
};
