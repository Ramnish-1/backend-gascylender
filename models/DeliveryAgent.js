const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const DeliveryAgent = sequelize.define('DeliveryAgent', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [2, 100]
    }
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      len: [10, 15]
    }
  },
  vehicleNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      len: [5, 20]
    }
  },
  panCardNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      len: [10, 10],
      is: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/
    }
  },
  aadharCardNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      len: [12, 12],
      is: /^[0-9]{12}$/
    }
  },
  drivingLicence: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      len: [10, 20]
    }
  },
  bankDetails: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('online', 'offline'),
    defaultValue: 'offline'
  },
  joinedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    validate: {
      isDate: true
    }
  },
  profileImage: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: 'delivery_agents',
  timestamps: true
});

module.exports = DeliveryAgent;
