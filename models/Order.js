const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Order = sequelize.define('Order', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  orderNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  // Customer details
  customerName: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [2, 100]
    }
  },
  customerEmail: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isEmail: true
    }
  },
  customerPhone: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [10, 15]
    }
  },
  customerAddress: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  // Order details
  items: {
    type: DataTypes.JSONB,
    allowNull: false,
    // Array of { productId, productName, variantLabel, variantPrice, quantity, total }
  },
  subtotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  totalAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  // Payment details
  paymentMethod: {
    type: DataTypes.ENUM('cash_on_delivery'),
    defaultValue: 'cash_on_delivery'
  },
  paymentStatus: {
    type: DataTypes.ENUM('pending', 'paid', 'failed'),
    defaultValue: 'pending'
  },
  // Order status
  status: {
    type: DataTypes.ENUM('pending', 'confirmed', 'assigned', 'out_for_delivery', 'delivered', 'cancelled'),
    defaultValue: 'pending'
  },
  // Agent assignment
  assignedAgentId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'delivery_agents',
      key: 'id'
    }
  },
  // OTP for delivery verification
  deliveryOTP: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      len: [6, 6]
    }
  },
  otpExpiresAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  // Timestamps
  confirmedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  assignedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  outForDeliveryAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  deliveredAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  cancelledAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  // Notes
  adminNotes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  agentNotes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'orders',
  timestamps: true
});

module.exports = Order;

