const { Product } = require('../models');
const { createProduct, updateProduct, updateStatus } = require('../validations/productValidation');
const { createError } = require('../utils/errorHandler');
const logger = require('../utils/logger');
const { Op } = require('sequelize');

// Create a new product
const createProductHandler = async (req, res, next) => {
  try {
    // If variants or images are passed as JSON strings (form-data), parse them
    const body = { ...req.body };
    if (typeof body.variants === 'string') {
      try { body.variants = JSON.parse(body.variants); } catch (_) {}
    }
    if (typeof body.images === 'string') {
      try { body.images = JSON.parse(body.images); } catch (_) {}
    }

    // Handle uploaded images (cloudinary)
    if (Array.isArray(req.files) && req.files.length > 0) {
      const uploadedUrls = req.files.map(f => f.path); // Cloudinary URL
      if (Array.isArray(body.images)) {
        body.images = [...body.images, ...uploadedUrls];
      } else {
        body.images = uploadedUrls;
      }
    }

    // Validate request body
    const { error, value } = createProduct.validate(body);
    if (error) {
      return next(createError(400, error.details[0].message));
    }

    // Check if product name already exists
    const existingProduct = await Product.findOne({ where: { productName: value.productName } });
    if (existingProduct) {
      return next(createError(400, 'Product name already exists'));
    }

    // Create product
    const product = await Product.create(value);

    logger.info(`Product created: ${product.productName}`);

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: { product }
    });
  } catch (error) {
    next(error);
  }
};

// Get all products (comprehensive endpoint)
const getAllProducts = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status, search, id } = req.query;
    const offset = (page - 1) * limit;

    // If ID is provided, get specific product
    if (id) {
      const product = await Product.findByPk(id);
      if (!product) {
        return next(createError(404, 'Product not found'));
      }

      return res.status(200).json({
        success: true,
        message: 'Product retrieved successfully',
        data: { product }
      });
    }

    // Build where clause
    const whereClause = {};
    if (status) {
      whereClause.status = status;
    }
    if (search) {
      whereClause[Op.or] = [
        { productName: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
        { unit: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const products = await Product.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    const totalPages = Math.ceil(products.count / limit);

    res.status(200).json({
      success: true,
      message: 'Products retrieved successfully',
      data: {
        products: products.rows,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: products.count,
          itemsPerPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Update product
const updateProductHandler = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Parse possibly stringified arrays when form-data
    const body = { ...req.body };
    if (typeof body.variants === 'string') {
      try { body.variants = JSON.parse(body.variants); } catch (_) {}
    }
    if (typeof body.images === 'string') {
      try { body.images = JSON.parse(body.images); } catch (_) {}
    }

    // Handle uploaded images (cloudinary - append)
    if (Array.isArray(req.files) && req.files.length > 0) {
      const uploadedUrls = req.files.map(f => f.path); // Cloudinary URL
      if (Array.isArray(body.images)) {
        body.images = [...body.images, ...uploadedUrls];
      } else {
        body.images = uploadedUrls;
      }
    }

    // Validate request body
    const { error, value } = updateProduct.validate(body);
    if (error) {
      return next(createError(400, error.details[0].message));
    }

    const product = await Product.findByPk(id);
    if (!product) {
      return next(createError(404, 'Product not found'));
    }

    // Check if product name is being updated and if it already exists
    if (value.productName && value.productName !== product.productName) {
      const existingProduct = await Product.findOne({ where: { productName: value.productName } });
      if (existingProduct) {
        return next(createError(400, 'Product name already exists'));
      }
    }

    // Update product
    await product.update(value);

    logger.info(`Product updated: ${product.productName}`);

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: { product }
    });
  } catch (error) {
    next(error);
  }
};

// Delete product
const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    const product = await Product.findByPk(id);
    if (!product) {
      return next(createError(404, 'Product not found'));
    }

    await product.destroy();

    logger.info(`Product deleted: ${product.productName}`);

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Update product status
const updateProductStatus = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validate request body
    const { error, value } = updateStatus.validate(req.body);
    if (error) {
      return next(createError(400, error.details[0].message));
    }

    const product = await Product.findByPk(id);
    if (!product) {
      return next(createError(404, 'Product not found'));
    }

    // Update status
    await product.update({ status: value.status });

    logger.info(`Product status updated: ${product.productName} - ${value.status}`);

    res.status(200).json({
      success: true,
      message: 'Product status updated successfully',
      data: { product }
    });
  } catch (error) {
    next(error);
  }
};

// Get individual product by ID
const getProductById = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const product = await Product.findByPk(id);
    
    if (!product) {
      return next(createError(404, 'Product not found'));
    }

    res.status(200).json({
      success: true,
      message: 'Product retrieved successfully',
      data: { product }
    });
  } catch (error) {
    next(error);
  }
};

// Get products by status
const getProductsByStatus = async (req, res, next) => {
  try {
    const { status } = req.params;

    if (!['active', 'inactive'].includes(status)) {
      return next(createError(400, 'Invalid status. Must be active or inactive'));
    }

    const products = await Product.findAll({
      where: { status },
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json({
      success: true,
      message: `${status} products retrieved successfully`,
      data: { products }
    });
  } catch (error) {
    next(error);
  }
};



module.exports = {
  createProductHandler,
  getAllProducts,
  getProductById,
  updateProductHandler,
  deleteProduct,
  updateProductStatus,
  getProductsByStatus
};
