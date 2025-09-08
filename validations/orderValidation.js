const Joi = require('joi');

// Item schema for order items
const orderItemSchema = Joi.object({
  productId: Joi.string().uuid().required().messages({
    'string.guid': 'Product ID must be a valid UUID',
    'any.required': 'Product ID is required'
  }),
  productName: Joi.string().min(2).max(200).required().messages({
    'string.min': 'Product name must be at least 2 characters',
    'string.max': 'Product name cannot exceed 200 characters',
    'any.required': 'Product name is required'
  }),
  variantLabel: Joi.string().min(1).max(50).required().messages({
    'string.min': 'Variant label must be at least 1 character',
    'string.max': 'Variant label cannot exceed 50 characters',
    'any.required': 'Variant label is required'
  }),
  variantPrice: Joi.number().positive().precision(2).required().messages({
    'number.base': 'Variant price must be a valid number',
    'number.positive': 'Variant price must be positive',
    'any.required': 'Variant price is required'
  }),
  quantity: Joi.number().integer().min(1).required().messages({
    'number.base': 'Quantity must be a valid number',
    'number.integer': 'Quantity must be a whole number',
    'number.min': 'Quantity must be at least 1',
    'any.required': 'Quantity is required'
  }),
  total: Joi.number().positive().precision(2).required().messages({
    'number.base': 'Total must be a valid number',
    'number.positive': 'Total must be positive',
    'any.required': 'Total is required'
  })
});

// Create order validation
const createOrder = Joi.object({
  customerName: Joi.string().min(2).max(100).required().messages({
    'string.min': 'Customer name must be at least 2 characters',
    'string.max': 'Customer name cannot exceed 100 characters',
    'any.required': 'Customer name is required'
  }),
  customerEmail: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Customer email is required'
  }),
  customerPhone: Joi.string().pattern(/^[0-9]{10,15}$/).required().messages({
    'string.pattern.base': 'Phone number must be 10-15 digits',
    'any.required': 'Customer phone is required'
  }),
  customerAddress: Joi.string().min(10).max(500).required().messages({
    'string.min': 'Address must be at least 10 characters',
    'string.max': 'Address cannot exceed 500 characters',
    'any.required': 'Customer address is required'
  }),
  items: Joi.array().items(orderItemSchema).min(1).required().messages({
    'array.base': 'Items must be an array',
    'array.min': 'At least one item is required',
    'any.required': 'Items are required'
  }),
  paymentMethod: Joi.string().valid('cash_on_delivery').default('cash_on_delivery').messages({
    'any.only': 'Payment method must be cash on delivery'
  })
});

// Update order status validation
const updateOrderStatus = Joi.object({
  status: Joi.string().valid('pending', 'confirmed', 'assigned', 'out_for_delivery', 'delivered', 'cancelled').required().messages({
    'any.only': 'Status must be one of: pending, confirmed, assigned, out_for_delivery, delivered, cancelled',
    'any.required': 'Status is required'
  }),
  adminNotes: Joi.string().max(1000).optional().messages({
    'string.max': 'Admin notes cannot exceed 1000 characters'
  }),
  agentNotes: Joi.string().max(1000).optional().messages({
    'string.max': 'Agent notes cannot exceed 1000 characters'
  })
});

// Assign agent validation
const assignAgent = Joi.object({
  agentId: Joi.string().uuid().required().messages({
    'string.guid': 'Agent ID must be a valid UUID',
    'any.required': 'Agent ID is required'
  })
});

// Send OTP validation
const sendOTP = Joi.object({
  orderId: Joi.string().uuid().required().messages({
    'string.guid': 'Order ID must be a valid UUID',
    'any.required': 'Order ID is required'
  })
});

// Verify OTP validation
const verifyOTP = Joi.object({
  orderId: Joi.string().uuid().required().messages({
    'string.guid': 'Order ID must be a valid UUID',
    'any.required': 'Order ID is required'
  }),
  otp: Joi.string().pattern(/^[0-9]{6}$/).required().messages({
    'string.pattern.base': 'OTP must be 6 digits',
    'any.required': 'OTP is required'
  })
});

// Cancel order validation
const cancelOrder = Joi.object({
  reason: Joi.string().min(5).max(500).required().messages({
    'string.min': 'Cancellation reason must be at least 5 characters',
    'string.max': 'Cancellation reason cannot exceed 500 characters',
    'any.required': 'Cancellation reason is required'
  })
});

module.exports = {
  createOrder,
  updateOrderStatus,
  assignAgent,
  sendOTP,
  verifyOTP,
  cancelOrder
};

