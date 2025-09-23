const { Product } = require('../models');
const { createProduct, updateProduct, updateStatus } = require('../validations/productValidation');
const { createError } = require('../utils/errorHandler');
const logger = require('../utils/logger');
const { Op, Sequelize } = require('sequelize');

// Create a new product
const createProductHandler = async (req, res, next) => {
  try {
    // If variants, images, or agency are passed as JSON strings (form-data), parse them
    const body = { ...req.body };
    if (typeof body.variants === 'string') {
      try { body.variants = JSON.parse(body.variants); } catch (_) {}
    }
    if (typeof body.images === 'string') {
      try { body.images = JSON.parse(body.images); } catch (_) {}
    }
    if (typeof body.agencies === 'string') {
      try { body.agencies = JSON.parse(body.agencies); } catch (_) {}
    }

    // Set agencyId from token if user is agency owner
    if (req.user && req.user.role === 'agency_owner' && req.user.agencyId) {
      body.agencyId = req.user.agencyId;
    } else if (req.user && req.user.role === 'admin' && body.agencyId) {
      // Admin can specify agencyId
      body.agencyId = body.agencyId;
    } else if (!req.user || req.user.role !== 'admin') {
      return next(createError(403, 'Only agency owners and admins can create products'));
    }

    // If base64 images provided, upload them to Cloudinary
    if (Array.isArray(body.images)) {
      const cloudinary = require('../config/cloudinary');
      const dataUrls = body.images.filter((img) => typeof img === 'string' && /^data:image\//i.test(img));
      const urlStrings = body.images.filter((img) => typeof img === 'string' && !/^data:image\//i.test(img));
      if (dataUrls.length > 0) {
        const uploaded = await Promise.all(
          dataUrls.map((img) => cloudinary.uploader.upload(img, { folder: 'lpg-products' }))
        );
        body.images = [...urlStrings, ...uploaded.map((u) => u.secure_url)];
      }
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

    // Check if product name already exists for this agency
    const existingProduct = await Product.findOne({ 
      where: { 
        productName: value.productName,
        agencyId: value.agencyId
      } 
    });
    if (existingProduct) {
      return next(createError(400, 'Product name already exists for this agency'));
    }

    // Create product
    const product = await Product.create(value);

    logger.info(`Product created: ${product.productName} for agency: ${value.agencyId}`);

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
    const { page = 1, limit = 10, status, search, id, agencyId, agencyEmail, agencyName, agencyCity, agencyPhone } = req.query;
    const offset = (page - 1) * limit;

    // If ID is provided, get specific product
    if (id) {
      const whereClause = { id };
      
      // Filter by agency if user is agency owner
      if (req.user && req.user.role === 'agency_owner' && req.user.agencyId) {
        whereClause.agencyId = req.user.agencyId;
      }
      
      const product = await Product.findOne({ 
        where: whereClause,
        include: [
          {
            model: require('../models').Agency,
            as: 'Agency',
            attributes: ['id', 'name', 'email', 'phone', 'city', 'status'],
            required: false
          }
        ]
      });
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
    
    // Filter by agency if user is agency owner
    if (req.user && req.user.role === 'agency_owner' && req.user.agencyId) {
      whereClause.agencyId = req.user.agencyId;
    }
    
    // Filter by specific agencyId if provided (admin and customer)
    if (agencyId && req.user && (req.user.role === 'admin' || req.user.role === 'customer')) {
      whereClause.agencyId = agencyId;
      console.log('🔍 Agency Filter Applied:', { agencyId, userRole: req.user.role });
    }
    
    console.log('🔍 Final Where Clause:', JSON.stringify(whereClause, null, 2));
    
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

    // Optional filters on embedded agencies JSON array (Postgres JSONB)
    // Use text casting of JSONB for robust partial ILIKE matches across array elements
    const andConditions = [];
    if (agencyEmail) {
      andConditions.push(
        Sequelize.where(
          Sequelize.cast(Sequelize.col('agencies'), 'text'),
          { [Op.iLike]: `%${agencyEmail}%` }
        )
      );
    }
    if (agencyName) {
      andConditions.push(
        Sequelize.where(
          Sequelize.cast(Sequelize.col('agencies'), 'text'),
          { [Op.iLike]: `%${agencyName}%` }
        )
      );
    }
    if (agencyCity) {
      andConditions.push(
        Sequelize.where(
          Sequelize.cast(Sequelize.col('agencies'), 'text'),
          { [Op.iLike]: `%${agencyCity}%` }
        )
      );
    }
    if (agencyPhone) {
      andConditions.push(
        Sequelize.where(
          Sequelize.cast(Sequelize.col('agencies'), 'text'),
          { [Op.iLike]: `%${agencyPhone}%` }
        )
      );
    }
    if (andConditions.length > 0) {
      whereClause[Op.and] = (whereClause[Op.and] || []).concat(andConditions);
    }

    const products = await Product.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: require('../models').Agency,
          as: 'Agency',
          attributes: ['id', 'name', 'email', 'phone', 'city', 'status'],
          required: false
        }
      ],
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
    if (typeof body.agencies === 'string') {
      try { body.agencies = JSON.parse(body.agencies); } catch (_) {}
    }

    // If base64 images provided during update, upload them to Cloudinary
    if (Array.isArray(body.images)) {
      const cloudinary = require('../config/cloudinary');
      const dataUrls = body.images.filter((img) => typeof img === 'string' && /^data:image\//i.test(img));
      const urlStrings = body.images.filter((img) => typeof img === 'string' && !/^data:image\//i.test(img));
      if (dataUrls.length > 0) {
        const uploaded = await Promise.all(
          dataUrls.map((img) => cloudinary.uploader.upload(img, { folder: 'lpg-products' }))
        );
        body.images = [...urlStrings, ...uploaded.map((u) => u.secure_url)];
      }
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

    // Build where clause for finding product
    const whereClause = { id };
    if (req.user && req.user.role === 'agency_owner' && req.user.agencyId) {
      whereClause.agencyId = req.user.agencyId;
    }

    const product = await Product.findOne({ where: whereClause });
    if (!product) {
      return next(createError(404, 'Product not found'));
    }

    // Check if product name is being updated and if it already exists for this agency
    if (value.productName && value.productName !== product.productName) {
      const existingProduct = await Product.findOne({ 
        where: { 
          productName: value.productName,
          agencyId: product.agencyId
        } 
      });
      if (existingProduct) {
        return next(createError(400, 'Product name already exists for this agency'));
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

    // Build where clause for finding product
    const whereClause = { id };
    if (req.user && req.user.role === 'agency_owner' && req.user.agencyId) {
      whereClause.agencyId = req.user.agencyId;
    }

    const product = await Product.findOne({ where: whereClause });
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

    // Build where clause for finding product
    const whereClause = { id };
    if (req.user && req.user.role === 'agency_owner' && req.user.agencyId) {
      whereClause.agencyId = req.user.agencyId;
    }

    const product = await Product.findOne({ where: whereClause });
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
    
    // Build where clause for finding product
    const whereClause = { id };
    if (req.user && req.user.role === 'agency_owner' && req.user.agencyId) {
      whereClause.agencyId = req.user.agencyId;
    }
    
    const product = await Product.findOne({ 
      where: whereClause,
      include: [
        {
          model: require('../models').Agency,
          as: 'Agency',
          attributes: ['id', 'name', 'email', 'phone', 'city', 'status'],
          required: false
        }
      ]
    });
    
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

    // Build where clause
    const whereClause = { status };
    if (req.user && req.user.role === 'agency_owner' && req.user.agencyId) {
      whereClause.agencyId = req.user.agencyId;
    }

    const products = await Product.findAll({
      where: whereClause,
      include: [
        {
          model: require('../models').Agency,
          as: 'Agency',
          attributes: ['id', 'name', 'email', 'phone', 'city', 'status'],
          required: false
        }
      ],
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
