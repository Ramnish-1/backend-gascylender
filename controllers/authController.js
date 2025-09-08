const jwt = require('jsonwebtoken');
const { User, DeliveryAgent, LoginOTP } = require('../models');
const { 
  validateLogin, 
  validateSetupUser, 
  validateCustomerProfile, 
  validateAgentProfile,
  validateUpdateProfile,
  validateRequestOTP,
  validateVerifyOTP,
  validateDeleteAccount
} = require('../validations/authValidation');
const { updateAgentProfileComprehensive } = require('../validations/deliveryAgentValidation');
const { createError } = require('../utils/errorHandler');
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');

// Generate JWT token
const generateToken = (userId) => {
  const jwtSecret = process.env.JWT_SECRET;
  
  if (!jwtSecret) {
    throw new Error('JWT_SECRET is not configured. Please check your .env file.');
  }
  
  return jwt.sign(
    { userId },
    jwtSecret,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
};

// Login user
const login = async (req, res, next) => {
  try {
    // Validate input
    const { error } = validateLogin.validate(req.body);
    if (error) {
      return next(createError(400, error.details[0].message));
    }

    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({
      where: { email }
    });

    if (!user) {
      return next(createError(401, 'Invalid email or password'));
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return next(createError(401, 'Invalid email or password'));
    }

    // Generate token
    const token = generateToken(user.id);

    logger.info(`User logged in: ${user.email} (${user.role})`);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: user.toPublicJSON(),
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

// Setup initial user (first time setup - Admin)
const setupUser = async (req, res, next) => {
  try {
    // Check if any admin user already exists
    const existingAdmin = await User.findOne({ where: { role: 'admin' } });
    if (existingAdmin) {
      return next(createError(400, 'Admin user already exists.'));
    }

    let email, password;

    // If credentials provided in request body, use them
    if (req.body.email && req.body.password) {
      const { error } = validateSetupUser.validate(req.body);
      if (error) {
        return next(createError(400, error.details[0].message));
      }
      email = req.body.email;
      password = req.body.password;
    } else {
      // Use default credentials from environment variables
      email = process.env.DEFAULT_EMAIL;
      password = process.env.DEFAULT_PASSWORD;
      
      if (!email || !password) {
        return next(createError(400, 'Default credentials not configured in environment variables'));
      }
    }

    // Create admin user
    const user = await User.create({
      email,
      password,
      role: 'admin'
    });

    // Generate token
    const token = generateToken(user.id);

    logger.info(`Admin user created: ${user.email}`);

    res.status(201).json({
      success: true,
      message: 'Admin user created successfully',
      data: {
        user: user.toPublicJSON(),
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get current user profile
const getProfile = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.userId);
    
    if (!user) {
      return next(createError(404, 'User not found'));
    }

    // Prepare response data
    let responseData = {
      user: user.toPublicJSON()
    };

    // If agent, include delivery agent data
    if (user.role === 'agent') {
      // First check if user has deliveryAgentId
      if (user.deliveryAgentId) {
        const deliveryAgent = await DeliveryAgent.findByPk(user.deliveryAgentId);
        if (deliveryAgent) {
          responseData.deliveryAgent = {
            id: deliveryAgent.id,
            name: deliveryAgent.name,
            phone: deliveryAgent.phone,
            vehicleNumber: deliveryAgent.vehicleNumber,
            panCardNumber: deliveryAgent.panCardNumber,
            aadharCardNumber: deliveryAgent.aadharCardNumber,
            drivingLicence: deliveryAgent.drivingLicence,
            bankDetails: deliveryAgent.bankDetails,
            status: deliveryAgent.status,
            joinedAt: deliveryAgent.joinedAt,
            profileImage: deliveryAgent.profileImage
          };
        }
      } else {
        // Check if delivery agent exists with this email (admin might have added)
        const deliveryAgent = await DeliveryAgent.findOne({ where: { email: user.email } });
        if (deliveryAgent) {
          responseData.deliveryAgent = {
            id: deliveryAgent.id,
            name: deliveryAgent.name,
            phone: deliveryAgent.phone,
            vehicleNumber: deliveryAgent.vehicleNumber,
            panCardNumber: deliveryAgent.panCardNumber,
            aadharCardNumber: deliveryAgent.aadharCardNumber,
            drivingLicence: deliveryAgent.drivingLicence,
            bankDetails: deliveryAgent.bankDetails,
            status: deliveryAgent.status,
            joinedAt: deliveryAgent.joinedAt,
            profileImage: deliveryAgent.profileImage
          };
          
          // Update user with deliveryAgentId
          await user.update({ deliveryAgentId: deliveryAgent.id });
        }
      }
    }

    res.status(200).json({
      success: true,
      data: responseData
    });
  } catch (error) {
    next(error);
  }
};

// Complete customer profile
const completeCustomerProfile = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    
    // Validate request body
    const { error, value } = validateCustomerProfile.validate(req.body);
    if (error) {
      return next(createError(400, error.details[0].message));
    }

    // Find user
    const user = await User.findByPk(userId);
    if (!user) {
      return next(createError(404, 'User not found'));
    }

    if (user.role !== 'customer') {
      return next(createError(403, 'Only customers can complete customer profile'));
    }

    // Update user profile
    await user.update({
      name: value.name,
      phone: value.phone,
      address: value.address,
      isProfileComplete: true,
      registeredAt: new Date()
    });

    logger.info(`Customer profile completed: ${user.email}`);

    res.status(200).json({
      success: true,
      message: 'Customer profile completed successfully',
      data: {
        user: user.toPublicJSON()
      }
    });
  } catch (error) {
    next(error);
  }
};

// Complete agent profile
const completeAgentProfile = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    
    // Validate request body
    const { error, value } = validateAgentProfile.validate(req.body);
    if (error) {
      return next(createError(400, error.details[0].message));
    }

    // Find user
    const user = await User.findByPk(userId);
    if (!user) {
      return next(createError(404, 'User not found'));
    }

    if (user.role !== 'agent') {
      return next(createError(403, 'Only agents can complete agent profile'));
    }

    // Check if delivery agent exists with this email
    const deliveryAgent = await DeliveryAgent.findOne({ where: { email: user.email } });
    if (!deliveryAgent) {
      return next(createError(400, 'No delivery agent found with this email. Please contact admin.'));
    }

    // Update user profile
    await user.update({
      name: value.name,
      phone: value.phone,
      address: value.address,
      deliveryAgentId: deliveryAgent.id,
      isProfileComplete: true,
      registeredAt: new Date()
    });

    logger.info(`Agent profile completed: ${user.email}`);

    res.status(200).json({
      success: true,
      message: 'Agent profile completed successfully',
      data: {
        user: user.toPublicJSON(),
        deliveryAgent: {
          id: deliveryAgent.id,
          name: deliveryAgent.name,
          phone: deliveryAgent.phone,
          vehicleNumber: deliveryAgent.vehicleNumber,
          panCardNumber: deliveryAgent.panCardNumber,
          aadharCardNumber: deliveryAgent.aadharCardNumber,
          drivingLicence: deliveryAgent.drivingLicence,
          bankDetails: deliveryAgent.bankDetails,
          status: deliveryAgent.status
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Update user profile (with cloudinary image upload and multiple addresses)
const updateProfile = async (req, res, next) => {
  try {
    // Parse JSON strings if they come from form-data
    const body = { ...req.body };
    if (typeof body.addresses === 'string') {
      try { 
        body.addresses = JSON.parse(body.addresses); 
      } catch (parseError) {
        return next(createError(400, 'Invalid addresses JSON format'));
      }
    }

    // Validate request body
    const { error, value } = validateUpdateProfile.validate(body);
    if (error) {
      return next(createError(400, error.details[0].message));
    }

    const { name, phone, address, addresses } = value;
    const userId = req.user.userId;

    const user = await User.findByPk(userId);
    if (!user) {
      return next(createError(404, 'User not found'));
    }

    // Update user data
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;
    if (addresses !== undefined) updateData.addresses = addresses;

    // Handle cloudinary image upload if file is provided
    if (req.file) {
      // Add cloudinary URL to update data
      updateData.profileImage = req.file.path; // Cloudinary URL
    }

    await user.update(updateData);

    // If agent, also update delivery agent data
    let deliveryAgentData = null;
    if (user.role === 'agent' && user.deliveryAgentId) {
      const deliveryAgent = await DeliveryAgent.findByPk(user.deliveryAgentId);
      if (deliveryAgent) {
        // Update delivery agent with user data
        const agentUpdateData = {};
        if (name !== undefined) agentUpdateData.name = name;
        if (phone !== undefined) agentUpdateData.phone = phone;
        if (req.file) agentUpdateData.profileImage = req.file.path;
        
        await deliveryAgent.update(agentUpdateData);
        
        deliveryAgentData = {
          id: deliveryAgent.id,
          name: deliveryAgent.name,
          phone: deliveryAgent.phone,
          vehicleNumber: deliveryAgent.vehicleNumber,
          panCardNumber: deliveryAgent.panCardNumber,
          aadharCardNumber: deliveryAgent.aadharCardNumber,
          drivingLicence: deliveryAgent.drivingLicence,
          bankDetails: deliveryAgent.bankDetails,
          status: deliveryAgent.status,
          joinedAt: deliveryAgent.joinedAt,
          profileImage: deliveryAgent.profileImage
        };
      }
    }

    logger.info(`User profile updated: ${user.email}`);

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: user.toPublicJSON(),
        ...(req.file && { imageUrl: req.file.path }), // Cloudinary URL
        ...(deliveryAgentData && { deliveryAgent: deliveryAgentData })
      }
    });
  } catch (error) {
    next(error);
  }
};

// Request OTP for customer/agent login
const requestOTP = async (req, res, next) => {
  try {
    // Validate request body
    const { error, value } = validateRequestOTP.validate(req.body);
    if (error) {
      return next(createError(400, error.details[0].message));
    }

    const { email, role } = value;

    // For agent role, check if agent exists in delivery_agents table
    if (role === 'agent') {
      const agent = await DeliveryAgent.findOne({ where: { email } });
      if (!agent) {
        logger.warn(`Unauthorized agent login attempt: ${email}`);
        return next(createError(403, 'You are not registered as a delivery agent. Please contact admin.'));
      }
      logger.info(`Agent login request from: ${email} (${agent.name})`);
    }

    // Check if user exists with this email and role
    let user = await User.findOne({ where: { email, role } });
    
    // If user doesn't exist, create a temporary user
    if (!user) {
      user = await User.create({
        email,
        role,
        isProfileComplete: false
      });
      logger.info(`Temporary ${role} user created: ${email}`);
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Delete any existing OTP for this email and role
    await LoginOTP.destroy({ where: { email, role } });

    // Create new OTP
    await LoginOTP.create({
      email,
      otp,
      role,
      expiresAt
    });

    // Send OTP via email
    const { sendEmail } = require('../config/email');
    await sendEmail(email, 'loginOTP', { email, otp });

    logger.info(`OTP sent to ${email} for ${role} login`);

    res.status(200).json({
      success: true,
      message: 'OTP sent successfully',
      data: {
        email,
        role,
        expiresAt,
        isNewUser: !user.isProfileComplete
      }
    });
  } catch (error) {
    next(error);
  }
};

// Verify OTP and login customer/agent
const verifyOTP = async (req, res, next) => {
  try {
    // Validate request body
    const { error, value } = validateVerifyOTP.validate(req.body);
    if (error) {
      return next(createError(400, error.details[0].message));
    }

    const { email, otp, role } = value;

    // For agent role, double-check if agent exists in delivery_agents table
    if (role === 'agent') {
      const agent = await DeliveryAgent.findOne({ where: { email } });
      if (!agent) {
        logger.warn(`Unauthorized agent OTP verification attempt: ${email}`);
        return next(createError(403, 'You are not registered as a delivery agent. Please contact admin.'));
      }
    }

    // Find the OTP record
    const otpRecord = await LoginOTP.findOne({
      where: { email, otp, role, isUsed: false }
    });

    if (!otpRecord) {
      return next(createError(400, 'Invalid OTP'));
    }

    // Check if OTP is expired
    if (new Date() > new Date(otpRecord.expiresAt)) {
      return next(createError(400, 'OTP has expired'));
    }

    // Mark OTP as used
    await otpRecord.update({ isUsed: true });

    // Find the user
    const user = await User.findOne({ where: { email, role } });
    if (!user) {
      return next(createError(404, 'User not found'));
    }

    // Generate token
    const token = generateToken(user.id);

    logger.info(`User logged in with OTP: ${user.email} (${user.role})`);

    // If agent, include delivery agent data
    let responseData = {
      user: user.toPublicJSON(),
      token
    };

    if (role === 'agent') {
      // Get delivery agent data by email (since user might not have deliveryAgentId yet)
      const deliveryAgent = await DeliveryAgent.findOne({ where: { email } });
      if (deliveryAgent) {
        responseData.deliveryAgent = {
          id: deliveryAgent.id,
          name: deliveryAgent.name,
          email: deliveryAgent.email,
          phone: deliveryAgent.phone,
          vehicleNumber: deliveryAgent.vehicleNumber,
          panCardNumber: deliveryAgent.panCardNumber,
          aadharCardNumber: deliveryAgent.aadharCardNumber,
          drivingLicence: deliveryAgent.drivingLicence,
          bankDetails: deliveryAgent.bankDetails,
          status: deliveryAgent.status,
          profileImage: deliveryAgent.profileImage,
          joinedAt: deliveryAgent.joinedAt
        };
        
        // Update user with deliveryAgentId for future reference
        if (!user.deliveryAgentId) {
          await user.update({ deliveryAgentId: deliveryAgent.id });
        }
      }
    }

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: responseData
    });
  } catch (error) {
    next(error);
  }
};

// Logout user
const logout = async (req, res, next) => {
  try {
    // In a simple system, we just return success
    // In production, you might want to blacklist the token
    logger.info(`User logged out: ${req.user.userId}`);

    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Delete user account
const deleteAccount = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    
    // Validate request body
    const { error } = validateDeleteAccount.validate(req.body);
    if (error) {
      return next(createError(400, error.details[0].message));
    }

    // Find user
    const user = await User.findByPk(userId);
    if (!user) {
      return next(createError(404, 'User not found'));
    }

    // Only allow customers and agents to delete their own accounts
    if (user.role === 'admin') {
      return next(createError(403, 'Admin accounts cannot be deleted through this endpoint'));
    }

    const userEmail = user.email;
    const userRole = user.role;

    // Use database transaction to ensure all related data is cleaned up
    const { sequelize } = require('../config/database');
    await sequelize.transaction(async (transaction) => {
      // Delete related data based on user role
      if (userRole === 'customer') {
        // Delete customer's orders (optional - you might want to keep them for business records)
        // await Order.destroy({ where: { userId }, transaction });
        
        // Delete customer's login OTPs
        await LoginOTP.destroy({ where: { email: userEmail, role: userRole }, transaction });
        
        logger.info(`Customer account deleted: ${userEmail}`);
      } else if (userRole === 'agent') {
        // For agents, also clean up delivery agent data
        if (user.deliveryAgentId) {
          await DeliveryAgent.destroy({ where: { id: user.deliveryAgentId }, transaction });
        }
        
        // Delete agent's login OTPs
        await LoginOTP.destroy({ where: { email: userEmail, role: userRole }, transaction });
        
        logger.info(`Agent account deleted: ${userEmail}`);
      }

      // Finally, delete the user account
      await user.destroy({ transaction });
    });

    res.status(200).json({
      success: true,
      message: 'Account deleted successfully',
      data: {
        deletedEmail: userEmail,
        deletedRole: userRole,
        deletedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error(`Error deleting account: ${error.message}`);
    next(error);
  }
};

// Get all customers (Admin only)
const getAllCustomers = async (req, res, next) => {
  try {
    // Check if user is admin
    const currentUser = await User.findByPk(req.user.userId);
    if (!currentUser || currentUser.role !== 'admin') {
      return next(createError(403, 'Only admin can access customer list'));
    }

    // Get query parameters for pagination and filtering
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const status = req.query.status || ''; // active, inactive, or all

    // Build where clause
    const whereClause = {
      role: 'customer'
    };

    // Add search filter
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { phone: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // Add status filter
    if (status && status !== 'all') {
      whereClause.isProfileComplete = status === 'active';
    }

    // Get customers with pagination
    const { count, rows: customers } = await User.findAndCountAll({
      where: whereClause,
      attributes: [
        'id', 'name', 'email', 'phone', 'role', 'profileImage',
        'address', 'addresses', 'isProfileComplete', 'registeredAt',
        'createdAt', 'updatedAt'
      ],
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });

    // Calculate pagination info
    const totalPages = Math.ceil(count / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    logger.info(`Admin ${currentUser.email} accessed customer list. Found ${count} customers.`);

    res.status(200).json({
      success: true,
      message: 'Customers retrieved successfully',
      data: {
        customers,
        pagination: {
          currentPage: page,
          totalPages,
          totalCustomers: count,
          limit,
          hasNextPage,
          hasPrevPage
        }
      }
    });
  } catch (error) {
    logger.error(`Error getting customers: ${error.message}`);
    next(error);
  }
};

// Update agent profile (basic update for delivery agent data)
const updateAgentProfile = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const user = await User.findByPk(userId);
    
    if (!user) {
      return next(createError(404, 'User not found'));
    }

    if (user.role !== 'agent') {
      return next(createError(403, 'Only agents can update agent profile'));
    }

    // Get delivery agent data
    let deliveryAgent;
    if (user.deliveryAgentId) {
      deliveryAgent = await DeliveryAgent.findByPk(user.deliveryAgentId);
    } else {
      // Find by email if deliveryAgentId is not set
      deliveryAgent = await DeliveryAgent.findOne({ where: { email: user.email } });
      if (deliveryAgent) {
        await user.update({ deliveryAgentId: deliveryAgent.id });
      }
    }

    if (!deliveryAgent) {
      return next(createError(404, 'Delivery agent data not found'));
    }

    // Parse JSON strings if they come from form-data
    const body = { ...req.body };
    if (typeof body.addresses === 'string') {
      try { 
        body.addresses = JSON.parse(body.addresses); 
      } catch (parseError) {
        return next(createError(400, 'Invalid addresses JSON format'));
      }
    }

    // Validate request body
    const { error, value } = validateUpdateProfile.validate(body);
    if (error) {
      return next(createError(400, error.details[0].message));
    }

    const { name, phone, address, addresses } = value;

    // Update user data
    const userUpdateData = {};
    if (name !== undefined) userUpdateData.name = name;
    if (phone !== undefined) userUpdateData.phone = phone;
    if (address !== undefined) userUpdateData.address = address;
    if (addresses !== undefined) userUpdateData.addresses = addresses;

    // Handle cloudinary image upload if file is provided
    if (req.file) {
      userUpdateData.profileImage = req.file.path; // Cloudinary URL
    }

    await user.update(userUpdateData);

    // Update delivery agent data
    const agentUpdateData = {};
    if (name !== undefined) agentUpdateData.name = name;
    if (phone !== undefined) agentUpdateData.phone = phone;
    if (req.file) agentUpdateData.profileImage = req.file.path;

    await deliveryAgent.update(agentUpdateData);

    // Get updated data
    const updatedUser = await User.findByPk(userId);
    const updatedAgent = await DeliveryAgent.findByPk(deliveryAgent.id);

    logger.info(`Agent profile updated: ${user.email}`);

    res.status(200).json({
      success: true,
      message: 'Agent profile updated successfully',
      data: {
        user: updatedUser.toPublicJSON(),
        deliveryAgent: {
          id: updatedAgent.id,
          name: updatedAgent.name,
          email: updatedAgent.email,
          phone: updatedAgent.phone,
          vehicleNumber: updatedAgent.vehicleNumber,
          panCardNumber: updatedAgent.panCardNumber,
          aadharCardNumber: updatedAgent.aadharCardNumber,
          drivingLicence: updatedAgent.drivingLicence,
          bankDetails: updatedAgent.bankDetails,
          status: updatedAgent.status,
          profileImage: updatedAgent.profileImage,
          joinedAt: updatedAgent.joinedAt
        },
        ...(req.file && { imageUrl: req.file.path }) // Cloudinary URL
      }
    });
  } catch (error) {
    next(error);
  }
};

// Update agent profile comprehensively (all fields including sensitive data)
const updateAgentProfileComplete = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const user = await User.findByPk(userId);
    
    if (!user) {
      return next(createError(404, 'User not found'));
    }

    if (user.role !== 'agent') {
      return next(createError(403, 'Only agents can update agent profile'));
    }

    // Get delivery agent data
    let deliveryAgent;
    if (user.deliveryAgentId) {
      deliveryAgent = await DeliveryAgent.findByPk(user.deliveryAgentId);
    } else {
      // Find by email if deliveryAgentId is not set
      deliveryAgent = await DeliveryAgent.findOne({ where: { email: user.email } });
      if (deliveryAgent) {
        await user.update({ deliveryAgentId: deliveryAgent.id });
      }
    }

    if (!deliveryAgent) {
      return next(createError(404, 'Delivery agent data not found'));
    }

    // Parse JSON strings if they come from form-data
    const body = { ...req.body };
    if (typeof body.addresses === 'string') {
      try { 
        body.addresses = JSON.parse(body.addresses); 
      } catch (parseError) {
        return next(createError(400, 'Invalid addresses JSON format'));
      }
    }

    // Validate request body
    const { error, value } = updateAgentProfileComprehensive.validate(body);
    if (error) {
      return next(createError(400, error.details[0].message));
    }

    const { 
      name, 
      phone, 
      address, 
      addresses,
      vehicleNumber,
      panCardNumber,
      aadharCardNumber,
      drivingLicence,
      bankDetails,
      status
    } = value;

    // Update user data
    const userUpdateData = {};
    if (name !== undefined) userUpdateData.name = name;
    if (phone !== undefined) userUpdateData.phone = phone;
    if (address !== undefined) userUpdateData.address = address;
    if (addresses !== undefined) userUpdateData.addresses = addresses;

    // Handle cloudinary image upload if file is provided
    if (req.file) {
      userUpdateData.profileImage = req.file.path; // Cloudinary URL
    }

    await user.update(userUpdateData);

    // Update delivery agent data
    const agentUpdateData = {};
    if (name !== undefined) agentUpdateData.name = name;
    if (phone !== undefined) agentUpdateData.phone = phone;
    if (vehicleNumber !== undefined) agentUpdateData.vehicleNumber = vehicleNumber;
    if (panCardNumber !== undefined) agentUpdateData.panCardNumber = panCardNumber;
    if (aadharCardNumber !== undefined) agentUpdateData.aadharCardNumber = aadharCardNumber;
    if (drivingLicence !== undefined) agentUpdateData.drivingLicence = drivingLicence;
    if (bankDetails !== undefined) agentUpdateData.bankDetails = bankDetails;
    if (status !== undefined) agentUpdateData.status = status;
    if (req.file) agentUpdateData.profileImage = req.file.path;

    // Check for duplicate sensitive data (if being updated)
    if (vehicleNumber && vehicleNumber !== deliveryAgent.vehicleNumber) {
      const existingVehicle = await DeliveryAgent.findOne({ 
        where: { vehicleNumber, id: { [Op.ne]: deliveryAgent.id } } 
      });
      if (existingVehicle) {
        return next(createError(400, 'Vehicle number already exists'));
      }
    }

    if (panCardNumber && panCardNumber !== deliveryAgent.panCardNumber) {
      const existingPan = await DeliveryAgent.findOne({ 
        where: { panCardNumber, id: { [Op.ne]: deliveryAgent.id } } 
      });
      if (existingPan) {
        return next(createError(400, 'PAN card number already exists'));
      }
    }

    if (aadharCardNumber && aadharCardNumber !== deliveryAgent.aadharCardNumber) {
      const existingAadhar = await DeliveryAgent.findOne({ 
        where: { aadharCardNumber, id: { [Op.ne]: deliveryAgent.id } } 
      });
      if (existingAadhar) {
        return next(createError(400, 'Aadhar card number already exists'));
      }
    }

    if (drivingLicence && drivingLicence !== deliveryAgent.drivingLicence) {
      const existingLicence = await DeliveryAgent.findOne({ 
        where: { drivingLicence, id: { [Op.ne]: deliveryAgent.id } } 
      });
      if (existingLicence) {
        return next(createError(400, 'Driving licence already exists'));
      }
    }

    await deliveryAgent.update(agentUpdateData);

    // Get updated data
    const updatedUser = await User.findByPk(userId);
    const updatedAgent = await DeliveryAgent.findByPk(deliveryAgent.id);

    logger.info(`Agent comprehensive profile updated: ${user.email}`);

    res.status(200).json({
      success: true,
      message: 'Agent profile updated successfully',
      data: {
        user: updatedUser.toPublicJSON(),
        deliveryAgent: {
          id: updatedAgent.id,
          name: updatedAgent.name,
          email: updatedAgent.email,
          phone: updatedAgent.phone,
          vehicleNumber: updatedAgent.vehicleNumber,
          panCardNumber: updatedAgent.panCardNumber,
          aadharCardNumber: updatedAgent.aadharCardNumber,
          drivingLicence: updatedAgent.drivingLicence,
          bankDetails: updatedAgent.bankDetails,
          status: updatedAgent.status,
          profileImage: updatedAgent.profileImage,
          joinedAt: updatedAgent.joinedAt
        },
        ...(req.file && { imageUrl: req.file.path }) // Cloudinary URL
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  login,
  setupUser,
  completeCustomerProfile,
  completeAgentProfile,
  requestOTP,
  verifyOTP,
  getProfile,
  updateProfile,
  updateAgentProfile,
  updateAgentProfileComplete,
  logout,
  deleteAccount,
  getAllCustomers
};
