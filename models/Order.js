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
    allowNull: true
  },
  // Delivery mode
  deliveryMode: {
    type: DataTypes.ENUM('home_delivery', 'pickup'),
    allowNull: false,
    defaultValue: 'home_delivery'
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
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  paymentStatus: {
    type: DataTypes.ENUM('pending', 'paid', 'failed'),
    defaultValue: 'pending'
  },
  // Order status
  status: {
    type: DataTypes.ENUM('pending', 'confirmed', 'assigned', 'out_for_delivery', 'delivered', 'cancelled', 'returned'),
    defaultValue: 'pending'
  },
  // Agency assignment
  agencyId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'agencies',
      key: 'id'
    }
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
  // Track who cancelled the order
  cancelledBy: {
    type: DataTypes.ENUM('customer', 'admin', 'agency', 'system'),
    allowNull: true
  },
  cancelledById: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'ID of the user who cancelled the order'
  },
  cancelledByName: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Name of the user who cancelled the order'
  },
  // Return tracking
  returnedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  returnedBy: {
    type: DataTypes.ENUM('customer', 'admin', 'agency', 'system'),
    allowNull: true
  },
  returnedById: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'ID of the user who returned the order'
  },
  returnedByName: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Name of the user who returned the order'
  },
  returnReason: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Reason for returning the order'
  },
  // Notes
  adminNotes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  agentNotes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // Delivery proof and notes
  deliveryProofImage: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Cloudinary URL of delivery proof image'
  },
  deliveryNote: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Delivery note from agent'
  },
  paymentReceived: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Whether payment was received by agent'
  }
}, {
  tableName: 'orders',
  timestamps: true
});

module.exports = Order;

