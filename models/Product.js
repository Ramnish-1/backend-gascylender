const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Product = sequelize.define('Product', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  productName: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [2, 200]
    }
  },
  unit: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      len: [1, 50]
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      len: [3, 2000]
    }
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    validate: {
      min: 0
    }
  },
  stock: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  lowStockThreshold: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 10,
    validate: {
      min: 0
    }
  },
  category: {
    type: DataTypes.ENUM('lpg', 'accessories'),
    allowNull: false,
    defaultValue: 'lpg'
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive'),
    defaultValue: 'active'
  },
  variants: {
    // Array of { label: '3kg', unit: 'kg', price: 100.00, stock: 5 }
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: []
  },
  images: {
    // Array of image path strings
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: true,
    defaultValue: []
  }
}, {
  tableName: 'products',
  timestamps: true
});

module.exports = Product;
