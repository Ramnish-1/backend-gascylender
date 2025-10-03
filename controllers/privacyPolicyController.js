const { PrivacyPolicy } = require('../models');
const { createPrivacyPolicy, updatePrivacyPolicy, updateStatus } = require('../validations/privacyPolicyValidation');
const { createError } = require('../utils/errorHandler');
const logger = require('../utils/logger');
const { Op } = require('sequelize');

// Get socket service instance
const getSocketService = () => {
  return global.socketService;
};

// Create new Privacy Policy
const createPrivacyPolicyHandler = async (req, res, next) => {
  try {
    // Validate request body
    const { error, value } = createPrivacyPolicy.validate(req.body);
    if (error) {
      return next(createError(400, error.details[0].message));
    }

    // Check if title already exists
    const existingPolicy = await PrivacyPolicy.findOne({ where: { title: value.title } });
    if (existingPolicy) {
      return next(createError(400, 'Privacy Policy with this title already exists'));
    }

    // Add user ID who is creating/updating
    value.lastUpdatedBy = req.user.id;

    // Create Privacy Policy
    const privacyPolicy = await PrivacyPolicy.create(value);

    logger.info(`Privacy Policy created: ${privacyPolicy.title}`);

    // Emit socket notification for privacy policy creation
    const socketService = getSocketService();
    if (socketService) {
      socketService.emitPrivacyPolicyCreated({
        id: privacyPolicy.id,
        title: privacyPolicy.title,
        status: privacyPolicy.status,
        createdBy: req.user.email || 'admin'
      });
    }

    res.status(201).json({
      success: true,
      message: 'Privacy Policy created successfully',
      data: { privacyPolicy }
    });
  } catch (error) {
    next(error);
  }
};

// Get all Privacy Policies
const getAllPrivacyPolicies = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status, search, id } = req.query;
    const offset = (page - 1) * limit;

    // If ID is provided, get specific Privacy Policy
    if (id) {
      const privacyPolicy = await PrivacyPolicy.findByPk(id);
      if (!privacyPolicy) {
        return next(createError(404, 'Privacy Policy not found'));
      }

      return res.status(200).json({
        success: true,
        message: 'Privacy Policy retrieved successfully',
        data: { privacyPolicy }
      });
    }

    // Build where clause
    const whereClause = {};
    if (status) {
      whereClause.status = status;
    }
    if (search) {
      whereClause[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const privacyPolicies = await PrivacyPolicy.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    const totalPages = Math.ceil(privacyPolicies.count / limit);

    res.status(200).json({
      success: true,
      message: 'Privacy Policies retrieved successfully',
      data: {
        privacyPolicies: privacyPolicies.rows,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: privacyPolicies.count,
          itemsPerPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get Privacy Policy by ID
const getPrivacyPolicyById = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const privacyPolicy = await PrivacyPolicy.findByPk(id);
    
    if (!privacyPolicy) {
      return next(createError(404, 'Privacy Policy not found'));
    }

    res.status(200).json({
      success: true,
      message: 'Privacy Policy retrieved successfully',
      data: { privacyPolicy }
    });
  } catch (error) {
    next(error);
  }
};

// Update Privacy Policy
const updatePrivacyPolicyHandler = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validate request body
    const { error, value } = updatePrivacyPolicy.validate(req.body);
    if (error) {
      return next(createError(400, error.details[0].message));
    }

    const privacyPolicy = await PrivacyPolicy.findByPk(id);
    if (!privacyPolicy) {
      return next(createError(404, 'Privacy Policy not found'));
    }

    // Check if title is being updated and if it already exists
    if (value.title && value.title !== privacyPolicy.title) {
      const existingPolicy = await PrivacyPolicy.findOne({ where: { title: value.title } });
      if (existingPolicy) {
        return next(createError(400, 'Privacy Policy with this title already exists'));
      }
    }

    // Add user ID who is updating
    value.lastUpdatedBy = req.user.id;

    // Update Privacy Policy
    await privacyPolicy.update(value);

    logger.info(`Privacy Policy updated: ${privacyPolicy.title}`);

    res.status(200).json({
      success: true,
      message: 'Privacy Policy updated successfully',
      data: { privacyPolicy }
    });
  } catch (error) {
    next(error);
  }
};

// Delete Privacy Policy
const deletePrivacyPolicy = async (req, res, next) => {
  try {
    const { id } = req.params;

    const privacyPolicy = await PrivacyPolicy.findByPk(id);
    if (!privacyPolicy) {
      return next(createError(404, 'Privacy Policy not found'));
    }

    await privacyPolicy.destroy();

    logger.info(`Privacy Policy deleted: ${privacyPolicy.title}`);

    res.status(200).json({
      success: true,
      message: 'Privacy Policy deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Update Privacy Policy status
const updatePrivacyPolicyStatus = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validate request body
    const { error, value } = updateStatus.validate(req.body);
    if (error) {
      return next(createError(400, error.details[0].message));
    }

    const privacyPolicy = await PrivacyPolicy.findByPk(id);
    if (!privacyPolicy) {
      return next(createError(404, 'Privacy Policy not found'));
    }

    // Update status
    await privacyPolicy.update({ 
      status: value.status,
      lastUpdatedBy: req.user.id 
    });

    logger.info(`Privacy Policy status updated: ${privacyPolicy.title} - ${value.status}`);

    res.status(200).json({
      success: true,
      message: 'Privacy Policy status updated successfully',
      data: { privacyPolicy }
    });
  } catch (error) {
    next(error);
  }
};

// Get Privacy Policies by status
const getPrivacyPoliciesByStatus = async (req, res, next) => {
  try {
    const { status } = req.params;

    if (!['active', 'inactive'].includes(status)) {
      return next(createError(400, 'Invalid status. Must be active or inactive'));
    }

    const privacyPolicies = await PrivacyPolicy.findAll({
      where: { status },
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json({
      success: true,
      message: `${status} Privacy Policies retrieved successfully`,
      data: { privacyPolicies }
    });
  } catch (error) {
    next(error);
  }
};

// Get active Privacy Policies (for public use)
const getActivePrivacyPolicies = async (req, res, next) => {
  try {
    const privacyPolicies = await PrivacyPolicy.findAll({
      where: { status: 'active' },
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json({
      success: true,
      message: 'Active Privacy Policies retrieved successfully',
      data: { privacyPolicies }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createPrivacyPolicyHandler,
  getAllPrivacyPolicies,
  getPrivacyPolicyById,
  updatePrivacyPolicyHandler,
  deletePrivacyPolicy,
  updatePrivacyPolicyStatus,
  getPrivacyPoliciesByStatus,
  getActivePrivacyPolicies
};
