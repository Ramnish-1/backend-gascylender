const User = require('./User');
const DeliveryAgent = require('./DeliveryAgent');
const Product = require('./Product');
const Order = require('./Order');
const LoginOTP = require('./LoginOTP');
const Agency = require('./Agency');
const AgencyInventory = require('./AgencyInventory');
const AgencyOwner = require('./AgencyOwner');
const TermsAndConditions = require('./TermsAndConditions');
const PrivacyPolicy = require('./PrivacyPolicy');
const Category = require('./Category');

// Define associations
Order.belongsTo(DeliveryAgent, { 
  foreignKey: 'assignedAgentId', 
  as: 'DeliveryAgent' 
});

DeliveryAgent.hasMany(Order, { 
  foreignKey: 'assignedAgentId', 
  as: 'Orders' 
});

// Agency and AgencyOwner associations
Agency.belongsTo(AgencyOwner, { 
  foreignKey: 'ownerId', 
  as: 'Owner' 
});

AgencyOwner.hasOne(Agency, { 
  foreignKey: 'ownerId', 
  as: 'Agency' 
});

// Product and AgencyInventory associations
Product.hasMany(AgencyInventory, { 
  foreignKey: 'productId', 
  as: 'AgencyInventory' 
});

AgencyInventory.belongsTo(Product, { 
  foreignKey: 'productId', 
  as: 'Product' 
});

// Agency and AgencyInventory associations
Agency.hasMany(AgencyInventory, { 
  foreignKey: 'agencyId', 
  as: 'Inventory' 
});

AgencyInventory.belongsTo(Agency, { 
  foreignKey: 'agencyId', 
  as: 'Agency' 
});

// DeliveryAgent and Agency associations
DeliveryAgent.belongsTo(Agency, { 
  foreignKey: 'agencyId', 
  as: 'Agency' 
});

Agency.hasMany(DeliveryAgent, { 
  foreignKey: 'agencyId', 
  as: 'DeliveryAgents' 
});

// Order and Agency associations
Order.belongsTo(Agency, { 
  foreignKey: 'agencyId', 
  as: 'Agency' 
});

Agency.hasMany(Order, { 
  foreignKey: 'agencyId', 
  as: 'Orders' 
});

module.exports = {
  User,
  DeliveryAgent,
  Product,
  Order,
  LoginOTP,
  Agency,
  AgencyInventory,
  AgencyOwner,
  TermsAndConditions,
  PrivacyPolicy,
  Category
};
