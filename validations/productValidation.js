const Joi = require('joi');

// Shared schemas
const variantSchema = Joi.object({
  label: Joi.string().min(1).max(50).required(),
  unit: Joi.string().min(1).max(20).optional(),
  price: Joi.number().positive().precision(2).required(),
  stock: Joi.number().integer().min(0).default(0)
});


// Validation for creating a product
const createProduct = Joi.object({
  productName: Joi.string().min(2).max(200).required().messages({
    'string.min': 'Product name must be at least 2 characters long',
    'string.max': 'Product name cannot exceed 200 characters',
    'any.required': 'Product name is required'
  }),
  unit: Joi.string().min(1).max(50).optional().messages({
    'string.min': 'Unit must be at least 1 character long',
    'string.max': 'Unit cannot exceed 50 characters'
  }),
  description: Joi.string().min(3).max(2000).required().messages({
    'string.min': 'Description must be at least 3 characters long',
    'string.max': 'Description cannot exceed 2000 characters',
    'any.required': 'Description is required'
  }),
  price: Joi.number().positive().precision(2).optional().messages({
    'number.base': 'Price must be a valid number',
    'number.positive': 'Price must be positive',
  }),
  stock: Joi.number().integer().min(0).optional().messages({
    'number.base': 'Stock must be a valid number',
    'number.integer': 'Stock must be a whole number',
    'number.min': 'Stock cannot be negative'
  }),
  lowStockThreshold: Joi.number().integer().min(0).default(10).messages({
    'number.base': 'Low stock threshold must be a valid number',
    'number.integer': 'Low stock threshold must be a whole number',
    'number.min': 'Low stock threshold cannot be negative'
  }),
  category: Joi.string().valid('lpg', 'accessories').default('lpg').messages({
    'any.only': 'Category must be either lpg or accessories'
  }),
  status: Joi.string().valid('active', 'inactive').default('active').messages({
    'any.only': 'Status must be either active or inactive'
  }),
  variants: Joi.array().items(variantSchema).min(1).required().messages({
    'array.base': 'Variants must be an array',
    'array.min': 'At least one variant is required'
  }),
  images: Joi.array().items(Joi.string().min(1)).optional(),
  agencyId: Joi.string().uuid().optional().messages({
    'string.guid': 'Agency ID must be a valid UUID'
  })
});

// Validation for updating a product
const updateProduct = Joi.object({
  productName: Joi.string().min(2).max(200).optional().messages({
    'string.min': 'Product name must be at least 2 characters long',
    'string.max': 'Product name cannot exceed 200 characters'
  }),
  unit: Joi.string().min(1).max(50).optional().messages({
    'string.min': 'Unit must be at least 1 character long',
    'string.max': 'Unit cannot exceed 50 characters'
  }),
  description: Joi.string().min(3).max(2000).optional().messages({
    'string.min': 'Description must be at least 3 characters long',
    'string.max': 'Description cannot exceed 2000 characters'
  }),
  price: Joi.number().positive().precision(2).optional().messages({
    'number.base': 'Price must be a valid number',
    'number.positive': 'Price must be positive'
  }),
  stock: Joi.number().integer().min(0).optional().messages({
    'number.base': 'Stock must be a valid number',
    'number.integer': 'Stock must be a whole number',
    'number.min': 'Stock cannot be negative'
  }),
  lowStockThreshold: Joi.number().integer().min(0).optional().messages({
    'number.base': 'Low stock threshold must be a valid number',
    'number.integer': 'Low stock threshold must be a whole number',
    'number.min': 'Low stock threshold cannot be negative'
  }),
  category: Joi.string().valid('lpg', 'accessories').optional().messages({
    'any.only': 'Category must be either lpg or accessories'
  }),
  status: Joi.string().valid('active', 'inactive').optional().messages({
    'any.only': 'Status must be either active or inactive'
  }),
  variants: Joi.array().items(variantSchema).min(1).optional(),
  images: Joi.array().items(Joi.string().min(1)).optional(),
  agencyId: Joi.string().uuid().optional().messages({
    'string.guid': 'Agency ID must be a valid UUID'
  })
}).unknown(true);

// Validation for updating status only
const updateStatus = Joi.object({
  status: Joi.string().valid('active', 'inactive').required().messages({
    'any.only': 'Status must be either active or inactive',
    'any.required': 'Status is required'
  })
});

module.exports = {
  createProduct,
  updateProduct,
  updateStatus
};
