const { sequelize, Sequelize } = require('../config/db');
const Product = require('./Product');

module.exports = {
  sequelize,
  Sequelize,
  Product
};
