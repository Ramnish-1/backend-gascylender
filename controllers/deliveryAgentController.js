const { DeliveryAgent } = require('../models');
const { createDeliveryAgent, updateDeliveryAgent, updateStatus } = require('../validations/deliveryAgentValidation');
const { createError } = require('../utils/errorHandler');
const logger = require('../utils/logger');
const { Op } = require('sequelize');

// Get socket service instance
const getSocketService = () => {
  return global.socketService;
};

// Create a new delivery agent
const createAgent = async (req, res, next) => {
  try {
    // Validate request body
    const { error, value } = createDeliveryAgent.validate(req.body);
    if (error) {
      return next(createError(400, error.details[0].message));
    }

    // Set agencyId from token if user is agency owner
    if (req.user && req.user.role === 'agency_owner' && req.user.agencyId) {
      value.agencyId = req.user.agencyId;
    } else if (req.user && req.user.role === 'admin' && value.agencyId) {
      // Admin can specify agencyId
      value.agencyId = value.agencyId;
    } else if (!req.user || req.user.role !== 'admin') {
      return next(createError(403, 'Only agency owners and admins can create delivery agents'));
    }

    // Check if email already exists
    const existingEmail = await DeliveryAgent.findOne({ where: { email: value.email } });
    if (existingEmail) {
      return next(createError(400, 'Email already exists'));
    }

    // Check if phone already exists
    const existingPhone = await DeliveryAgent.findOne({ where: { phone: value.phone } });
    if (existingPhone) {
      return next(createError(400, 'Phone number already exists'));
    }

    // Check if vehicle number already exists
    const existingVehicle = await DeliveryAgent.findOne({ where: { vehicleNumber: value.vehicleNumber } });
    if (existingVehicle) {
      return next(createError(400, 'Vehicle number already exists'));
    }

    // Check if PAN card already exists
    const existingPan = await DeliveryAgent.findOne({ where: { panCardNumber: value.panCardNumber } });
    if (existingPan) {
      return next(createError(400, 'PAN card number already exists'));
    }

    // Check if Aadhar card already exists
    const existingAadhar = await DeliveryAgent.findOne({ where: { aadharCardNumber: value.aadharCardNumber } });
    if (existingAadhar) {
      return next(createError(400, 'Aadhar card number already exists'));
    }

    // Check if driving licence already exists
    const existingLicence = await DeliveryAgent.findOne({ where: { drivingLicence: value.drivingLicence } });
    if (existingLicence) {
      return next(createError(400, 'Driving licence already exists'));
    }

    // Set joinedAt to current date if not provided
    if (!value.joinedAt) {
      value.joinedAt = new Date();
    }

    // Handle optional cloudinary image upload
    if (req.file) {
      value.profileImage = req.file.path; // Cloudinary URL
    }

    // Create delivery agent
    const agent = await DeliveryAgent.create(value);

    logger.info(`Delivery agent created: ${agent.email} for agency: ${value.agencyId}`);

    // Emit socket notification for agent creation
    const socketService = getSocketService();
    if (socketService) {
      socketService.emitAgentCreated({
        id: agent.id,
        name: agent.name,
        email: agent.email,
        phone: agent.phone,
        agencyId: agent.agencyId,
        status: agent.status,
        createdBy: req.user.email || 'admin'
      });
    }

    res.status(201).json({
      success: true,
      message: 'Delivery agent created successfully',
      data: { 
        agent,
        ...(req.file && { imageUrl: req.file.path }) // Return cloudinary URL
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get all delivery agents (comprehensive endpoint)
const getAllAgents = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status, search, id } = req.query;
    const offset = (page - 1) * limit;

    // If ID is provided, get specific agent
    if (id) {
      const whereClause = { id };
      
      // Filter by agency if user is agency owner
      if (req.user && req.user.role === 'agency_owner' && req.user.agencyId) {
        whereClause.agencyId = req.user.agencyId;
      }
      
      const agent = await DeliveryAgent.findOne({ where: whereClause });
      if (!agent) {
        return next(createError(404, 'Delivery agent not found'));
      }

      return res.status(200).json({
        success: true,
        message: 'Delivery agent retrieved successfully',
        data: { agent }
      });
    }

    // Build where clause
    const whereClause = {};
    
    // Filter by agency if user is agency owner
    if (req.user && req.user.role === 'agency_owner' && req.user.agencyId) {
      whereClause.agencyId = req.user.agencyId;
    }
    
    if (status) {
      whereClause.status = status;
    }
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { phone: { [Op.iLike]: `%${search}%` } },
        { vehicleNumber: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const agents = await DeliveryAgent.findAndCountAll({
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

    const totalPages = Math.ceil(agents.count / limit);

    res.status(200).json({
      success: true,
      message: 'Delivery agents retrieved successfully',
      data: {
        agents: agents.rows,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: agents.count,
          itemsPerPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Update delivery agent
const updateAgent = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validate request body
    const { error, value } = updateDeliveryAgent.validate(req.body);
    if (error) {
      return next(createError(400, error.details[0].message));
    }

    // Build where clause for finding agent
    const whereClause = { id };
    if (req.user && req.user.role === 'agency_owner' && req.user.agencyId) {
      whereClause.agencyId = req.user.agencyId;
    }

    const agent = await DeliveryAgent.findOne({ where: whereClause });
    if (!agent) {
      return next(createError(404, 'Delivery agent not found'));
    }

    // Check if email is being updated and if it already exists
    if (value.email && value.email !== agent.email) {
      const existingEmail = await DeliveryAgent.findOne({ where: { email: value.email } });
      if (existingEmail) {
        return next(createError(400, 'Email already exists'));
      }
    }

    // Check if phone is being updated and if it already exists
    if (value.phone && value.phone !== agent.phone) {
      const existingPhone = await DeliveryAgent.findOne({ where: { phone: value.phone } });
      if (existingPhone) {
        return next(createError(400, 'Phone number already exists'));
      }
    }

    // Check if vehicle number is being updated and if it already exists
    if (value.vehicleNumber && value.vehicleNumber !== agent.vehicleNumber) {
      const existingVehicle = await DeliveryAgent.findOne({ where: { vehicleNumber: value.vehicleNumber } });
      if (existingVehicle) {
        return next(createError(400, 'Vehicle number already exists'));
      }
    }

    // Check if PAN card is being updated and if it already exists
    if (value.panCardNumber && value.panCardNumber !== agent.panCardNumber) {
      const existingPan = await DeliveryAgent.findOne({ where: { panCardNumber: value.panCardNumber } });
      if (existingPan) {
        return next(createError(400, 'PAN card number already exists'));
      }
    }

    // Check if Aadhar card is being updated and if it already exists
    if (value.aadharCardNumber && value.aadharCardNumber !== agent.aadharCardNumber) {
      const existingAadhar = await DeliveryAgent.findOne({ where: { aadharCardNumber: value.aadharCardNumber } });
      if (existingAadhar) {
        return next(createError(400, 'Aadhar card number already exists'));
      }
    }

    // Check if driving licence is being updated and if it already exists
    if (value.drivingLicence && value.drivingLicence !== agent.drivingLicence) {
      const existingLicence = await DeliveryAgent.findOne({ where: { drivingLicence: value.drivingLicence } });
      if (existingLicence) {
        return next(createError(400, 'Driving licence already exists'));
      }
    }

    // Handle optional cloudinary image upload
    if (req.file) {
      value.profileImage = req.file.path; // Cloudinary URL
    }

    // Update agent
    await agent.update(value);

    logger.info(`Delivery agent updated: ${agent.email}`);

    // Emit socket notification for agent update
    const socketService = getSocketService();
    if (socketService) {
      socketService.emitAgentUpdated({
        id: agent.id,
        name: agent.name,
        email: agent.email,
        phone: agent.phone,
        agencyId: agent.agencyId,
        status: agent.status,
        updatedBy: req.user.email || 'admin'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Delivery agent updated successfully',
      data: { 
        agent,
        ...(req.file && { imageUrl: req.file.path }) // Return cloudinary URL
      }
    });
  } catch (error) {
    next(error);
  }
};

// Delete delivery agent
const deleteAgent = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Build where clause for finding agent
    const whereClause = { id };
    if (req.user && req.user.role === 'agency_owner' && req.user.agencyId) {
      whereClause.agencyId = req.user.agencyId;
    }

    const agent = await DeliveryAgent.findOne({ where: whereClause });
    if (!agent) {
      return next(createError(404, 'Delivery agent not found'));
    }

    await agent.destroy();

    logger.info(`Delivery agent deleted: ${agent.email}`);

    res.status(200).json({
      success: true,
      message: 'Delivery agent deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Update agent status
const updateAgentStatus = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validate request body
    const { error, value } = updateStatus.validate(req.body);
    if (error) {
      return next(createError(400, error.details[0].message));
    }

    // Build where clause for finding agent
    const whereClause = { id };
    if (req.user && req.user.role === 'agency_owner' && req.user.agencyId) {
      whereClause.agencyId = req.user.agencyId;
    }

    const agent = await DeliveryAgent.findOne({ where: whereClause });
    if (!agent) {
      return next(createError(404, 'Delivery agent not found'));
    }

    // Update status
    await agent.update({ status: value.status });

    logger.info(`Delivery agent status updated: ${agent.email} - ${value.status}`);

    // Emit socket notification for agent status change
    const socketService = getSocketService();
    if (socketService) {
      socketService.emitAgentStatusUpdated({
        id: agent.id,
        name: agent.name,
        email: agent.email,
        phone: agent.phone,
        agencyId: agent.agencyId,
        status: agent.status,
        updatedBy: req.user.email || 'admin',
        timestamp: new Date()
      });
    }

    res.status(200).json({
      success: true,
      message: 'Agent status updated successfully',
      data: { agent }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createAgent,
  getAllAgents,
  updateAgent,
  deleteAgent,
  updateAgentStatus
};
