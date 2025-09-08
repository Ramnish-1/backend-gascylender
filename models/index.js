const User = require('./User');
const DeliveryAgent = require('./DeliveryAgent');
const Product = require('./Product');
const Order = require('./Order');
const LoginOTP = require('./LoginOTP');

// Define associations
Order.belongsTo(DeliveryAgent, { 
  foreignKey: 'assignedAgentId', 
  as: 'DeliveryAgent' 
});

DeliveryAgent.hasMany(Order, { 
  foreignKey: 'assignedAgentId', 
  as: 'Orders' 
});

module.exports = {
  User,
  DeliveryAgent,
  Product,
  Order,
  LoginOTP
};
