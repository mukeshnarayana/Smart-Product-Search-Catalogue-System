const { Sequelize } = require('sequelize');
const env = require('./env');

const connectionUri = env.isTest ? (env.TEST_DATABASE_URL || env.DATABASE_URL) : env.DATABASE_URL;

const isRemoteOrSsl = connectionUri && (
  connectionUri.includes('sslmode=require') ||
  connectionUri.includes('neon.tech') ||
  connectionUri.includes('aws') ||
  env.isProduction
);

const dialectOptions = {};
if (isRemoteOrSsl) {
  dialectOptions.ssl = {
    require: true,
    rejectUnauthorized: false
  };
}

const sequelize = new Sequelize(connectionUri, {
  dialect: 'postgres',
  dialectOptions,
  logging: env.NODE_ENV === 'development' ? (msg) => console.log(`[Sequelize] ${msg}`) : false,
  pool: {
    max: 10,
    min: env.isTest ? 0 : 2,
    acquire: 30000,
    idle: 10000
  },
  define: {
    timestamps: true,
    underscored: true
  }
});

module.exports = {
  sequelize,
  Sequelize
};
