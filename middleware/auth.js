const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { createError } = require('../utils/errorHandler');

// Authenticate user middleware
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(createError(401, 'Access token required'));
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if user exists
    const user = await User.findByPk(decoded.userId);
    if (!user) {
      return next(createError(401, 'User not found'));
    }

    // Add user info to request
    req.user = {
      userId: user.id,
      email: user.email,
      role: user.role,
      deliveryAgentId: user.deliveryAgentId
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(createError(401, 'Invalid token'));
    }
    if (error.name === 'TokenExpiredError') {
      return next(createError(401, 'Token expired'));
    }
    next(error);
  }
};

// Optional authentication middleware
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await User.findByPk(decoded.userId);
    if (user) {
      req.user = {
        userId: user.id,
        email: user.email,
        role: user.role,
        deliveryAgentId: user.deliveryAgentId
      };
    }

    next();
  } catch (error) {
    // Continue without authentication if token is invalid
    next();
  }
};

module.exports = {
  authenticate,
  optionalAuth
};
