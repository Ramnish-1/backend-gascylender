const { Agency, User, AgencyOwner } = require('../models');
const { createAgency, updateAgency } = require('../validations/agencyValidation');
const { createError } = require('../utils/errorHandler');
const logger = require('../utils/logger');
const crypto = require('crypto');
const bcrypt = require('bcrypt');

// Admin guard helper
const ensureAdmin = async (userId) => {
  const admin = await User.findByPk(userId);
  if (!admin || admin.role !== 'admin') {
    throw createError(403, 'Only admin can perform this action');
  }
  return admin;
};

// Create agency and send confirmation email
const create = async (req, res, next) => {
  try {
    await ensureAdmin(req.user.userId);

    const { error, value } = createAgency.validate(req.body);
    if (error) return next(createError(400, error.details[0].message));

    // Unique email check for both Agency and AgencyOwner
    const agencyExists = await Agency.findOne({ where: { email: value.email } });
    if (agencyExists) return next(createError(400, 'Agency with this email already exists'));

    const ownerExists = await AgencyOwner.findOne({ where: { email: value.email } });
    if (ownerExists) return next(createError(400, 'Agency owner with this email already exists'));

    const token = crypto.randomBytes(24).toString('hex');
    const confirmationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Use database transaction to ensure atomicity
    const { sequelize } = require('../config/database');
    const transaction = await sequelize.transaction();

    try {
      const agency = await Agency.create({
        ...value,
        status: 'inactive',
        confirmationToken: token,
        confirmationExpiresAt
      }, { transaction });

      // Generate random password for agency owner
      const randomPassword = crypto.randomBytes(8).toString('hex');
      
      // Create agency owner automatically (password will be hashed by beforeCreate hook)
      const agencyOwner = await AgencyOwner.create({
        name: agency.name + ' Owner',
        email: agency.email,
        password: randomPassword,
        phone: agency.phone,
        agencyId: agency.id,
        address: agency.address,
        city: agency.city,
        pincode: agency.pincode,
        state: 'Delhi', // Default state
        confirmationToken: token,
        confirmationTokenExpires: confirmationExpiresAt
      }, { transaction });

      // Update agency with owner
      await agency.update({
        ownerId: agencyOwner.id
      }, { transaction });

      // Commit transaction
      await transaction.commit();

      // Continue with email sending after successful transaction
      const confirmUrl = `${process.env.BACKEND_BASE_URL || 'http://localhost:5000'}/api/agencies/confirm?token=${token}`;
      
      // Send confirmation email with login credentials
      const emailTemplate = `
        <h2>Welcome to LPG Gas Platform</h2>
        <p>Dear ${agency.name} Team,</p>
        <p>Your agency has been registered successfully!</p>
        <p><strong>Agency Details:</strong></p>
        <ul>
          <li><strong>Name:</strong> ${agency.name}</li>
          <li><strong>Email:</strong> ${agency.email}</li>
          <li><strong>Phone:</strong> ${agency.phone}</li>
          <li><strong>Address:</strong> ${agency.address}, ${agency.city} - ${agency.pincode}</li>
        </ul>
        
        <p><strong>Your Login Credentials:</strong></p>
        <ul>
          <li><strong>Email:</strong> ${agency.email}</li>
          <li><strong>Password:</strong> ${randomPassword}</li>
        </ul>
        
        <p>Please click the link below to confirm your agency and activate your account:</p>
        <a href="${confirmUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Confirm Agency</a>
        
        <p><strong>Important:</strong></p>
        <ul>
          <li>Please change your password after first login</li>
          <li>This link will expire in 24 hours</li>
          <li>After confirmation, you can login at: <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/agency/login">Agency Login</a></li>
        </ul>
        
        <p>Best regards,<br>LPG Gas Platform Team</p>
      `;

      // Send response first
      res.status(201).json({
        success: true,
        message: 'Agency created successfully. Login credentials sent to agency email.',
        data: {
          agency: agency,
          owner: {
            id: agencyOwner.id,
            email: agencyOwner.email,
            name: agencyOwner.name
          },
          loginUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/agency/login`,
          credentials: {
            email: agency.email,
            password: randomPassword
          }
        }
      });

      // Send email after response (outside transaction)
      try {
        if (process.env.EMAIL_HOST && process.env.EMAIL_USER) {
          // Send email directly using nodemailer
          const nodemailer = require('nodemailer');
          
          const transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            port: process.env.EMAIL_PORT,
            secure: false,
            auth: {
              user: process.env.EMAIL_USER,
              pass: process.env.EMAIL_PASSWORD
            }
          });

          await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: agency.email,
            subject: 'Agency Registration Complete - Login Credentials',
            html: emailTemplate
          });

          logger.info(`Email sent successfully to: ${agency.email}`);
        } else {
          logger.info(`Agency and owner created: ${agency.email} (Email skipped - no email server configured)`);
        }
      } catch (emailError) {
        logger.error(`Email sending failed: ${emailError.message}`);
        // Don't throw error here as agency is already created
      }

    } catch (transactionError) {
      // Rollback transaction on error
      await transaction.rollback();
      logger.error(`Transaction failed: ${transactionError.message}`);
      return next(createError(500, 'Failed to create agency and owner'));
    }
  } catch (error) { 
    next(error); 
  }
};

// Confirm agency by token
const confirm = async (req, res, next) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).send(`
        <html>
          <head><title>Agency Confirmation</title></head>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h2 style="color: #e74c3c;">Error</h2>
            <p>Token is required for confirmation.</p>
          </body>
        </html>
      `);
    }

    const agency = await Agency.findOne({ where: { confirmationToken: token } });
    if (!agency) {
      return res.status(400).send(`
        <html>
          <head><title>Agency Confirmation</title></head>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h2 style="color: #e74c3c;">Invalid Token</h2>
            <p>The confirmation link is invalid or has already been used.</p>
          </body>
        </html>
      `);
    }

    if (agency.status === 'active') {
      return res.status(200).send(`
        <html>
          <head><title>Agency Confirmation</title></head>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h2 style="color: #27ae60;">Already Confirmed</h2>
            <p>Your agency "${agency.name}" is already active and confirmed.</p>
          </body>
        </html>
      `);
    }

    if (agency.confirmationExpiresAt && new Date() > new Date(agency.confirmationExpiresAt)) {
      return res.status(400).send(`
        <html>
          <head><title>Agency Confirmation</title></head>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h2 style="color: #e74c3c;">Link Expired</h2>
            <p>The confirmation link has expired. Please contact admin for a new link.</p>
          </body>
        </html>
      `);
    }

    await agency.update({ status: 'active', confirmationToken: null, confirmationExpiresAt: null });

    // Also activate the agency owner
    if (agency.ownerId) {
      await AgencyOwner.update(
        { 
          isActive: true, 
          isEmailVerified: true,
          confirmationToken: null,
          confirmationTokenExpires: null
        },
        { where: { id: agency.ownerId } }
      );
    }

    logger.info(`Agency confirmed: ${agency.email}`);

    res.status(200).send(`
      <html>
        <head><title>Agency Confirmation</title></head>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <div style="max-width: 500px; margin: 0 auto; background: #f8f9fa; padding: 30px; border-radius: 10px;">
            <h2 style="color: #27ae60;">✅ Confirmation Successful!</h2>
            <p><strong>Thank you for confirming your agency!</strong></p>
            <p>Your agency "<strong>${agency.name}</strong>" has been successfully activated.</p>
            <p>You can now start using our services.</p>
            <div style="margin-top: 30px; padding: 20px; background: #e8f5e8; border-radius: 5px;">
              <p style="margin: 0; color: #27ae60;"><strong>Status: Active</strong></p>
            </div>
          </div>
        </body>
      </html>
    `);
  } catch (error) { 
    logger.error(`Agency confirmation error: ${error.message}`);
    res.status(500).send(`
      <html>
        <head><title>Agency Confirmation</title></head>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h2 style="color: #e74c3c;">Server Error</h2>
          <p>Something went wrong. Please try again later.</p>
        </body>
      </html>
    `);
  }
};

// List agencies with pagination and search
const list = async (req, res, next) => {
  try {
    await ensureAdmin(req.user.userId);

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const status = req.query.status || '';

    const { Op } = require('sequelize');
    const where = {};
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { phone: { [Op.iLike]: `%${search}%` } },
        { city: { [Op.iLike]: `%${search}%` } }
      ];
    }
    if (status && ['active', 'inactive'].includes(status)) where.status = status;

    const { count, rows } = await Agency.findAndCountAll({ where, order: [['createdAt', 'DESC']], limit, offset });

    res.status(200).json({
      success: true,
      data: {
        agencies: rows,
        pagination: { currentPage: page, totalPages: Math.ceil(count / limit), total: count, limit }
      }
    });
  } catch (error) { next(error); }
};

// List only active agencies (public endpoint - no auth required)
const listActive = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';

    const { Op } = require('sequelize');
    const where = { status: 'active' };
    
    if (search) {
      where[Op.and] = [
        { status: 'active' },
        {
          [Op.or]: [
            { name: { [Op.iLike]: `%${search}%` } },
            { email: { [Op.iLike]: `%${search}%` } },
            { phone: { [Op.iLike]: `%${search}%` } },
            { city: { [Op.iLike]: `%${search}%` } }
          ]
        }
      ];
    }

    const { count, rows } = await Agency.findAndCountAll({ 
      where, 
      order: [['createdAt', 'DESC']], 
      limit, 
      offset,
      attributes: ['id', 'name', 'email', 'phone', 'addressTitle', 'address', 'city', 'pincode', 'landmark', 'status', 'createdAt'] // Exclude sensitive fields
    });

    // Transform the response to include agencyId field
    const agenciesWithId = rows.map(agency => ({
      ...agency.toJSON(),
      agencyId: agency.id // Add agencyId field for frontend convenience
    }));

    res.status(200).json({
      success: true,
      data: {
        agencies: agenciesWithId,
        pagination: { currentPage: page, totalPages: Math.ceil(count / limit), total: count, limit }
      }
    });
  } catch (error) { next(error); }
};

// Get single agency
const getById = async (req, res, next) => {
  try {
    await ensureAdmin(req.user.userId);
    const agency = await Agency.findByPk(req.params.id);
    if (!agency) return next(createError(404, 'Agency not found'));
    res.status(200).json({ success: true, data: agency });
  } catch (error) { next(error); }
};

// Update agency
const update = async (req, res, next) => {
  try {
    await ensureAdmin(req.user.userId);
    const { error, value } = updateAgency.validate(req.body);
    if (error) return next(createError(400, error.details[0].message));

    const agency = await Agency.findByPk(req.params.id);
    if (!agency) return next(createError(404, 'Agency not found'));

    // If email is changing, ensure uniqueness
    if (value.email && value.email !== agency.email) {
      const exists = await Agency.findOne({ where: { email: value.email } });
      if (exists) return next(createError(400, 'Agency with this email already exists'));
      
      // Email is changing - generate new confirmation token and send email
      const token = crypto.randomBytes(24).toString('hex');
      const confirmationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      
      // Update with new email and reset confirmation status
      await agency.update({
        ...value,
        email: value.email,
        status: 'inactive', // Reset to inactive when email changes
        confirmationToken: token,
        confirmationExpiresAt
      });

      // Send confirmation email to new email address
      const { sendEmail } = require('../config/email');
      const confirmUrl = `${process.env.BACKEND_BASE_URL || 'http://localhost:5000'}/api/agencies/confirm?token=${token}`;
      await sendEmail(value.email, 'agencyConfirmation', { agency: { ...agency.toJSON(), email: value.email }, confirmUrl });

      logger.info(`Agency email changed: ${agency.email} -> ${value.email}. New confirmation email sent.`);

      res.status(200).json({ 
        success: true, 
        message: 'Agency updated. New confirmation email sent to the new email address.', 
        data: agency 
      });
    } else {
      // No email change - normal update
      await agency.update(value);
      res.status(200).json({ success: true, message: 'Agency updated', data: agency });
    }
  } catch (error) { next(error); }
};

// Update agency status
const updateStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate status
    if (!status || !['active', 'inactive'].includes(status)) {
      return next(createError(400, 'Status must be either active or inactive'));
    }

    const agency = await Agency.findByPk(id);
    if (!agency) {
      return next(createError(404, 'Agency not found'));
    }

    // Check permissions
    const userRole = req.user.role;
    
    if (userRole === 'admin') {
      // Admin can update any agency status
      await agency.update({ status });
      
      // Also update agency owner status
      if (agency.ownerId) {
        await AgencyOwner.update(
          { isActive: status === 'active' },
          { where: { id: agency.ownerId } }
        );
      }

      logger.info(`Admin updated agency status: ${agency.email} -> ${status}`);
      
      res.status(200).json({
        success: true,
        message: `Agency status updated to ${status}`,
        data: {
          id: agency.id,
          name: agency.name,
          email: agency.email,
          status: agency.status
        }
      });

    } else if (userRole === 'agency_owner') {
      // Agency owner can only update their own agency status
      if (req.user.agencyId !== agency.id) {
        return next(createError(403, 'You can only update your own agency status'));
      }

      // Agency owner can only activate their agency (not deactivate)
      if (status === 'inactive') {
        return next(createError(403, 'You cannot deactivate your own agency. Please contact admin.'));
      }

      // Only allow activation if agency is currently inactive
      if (agency.status === 'active') {
        return next(createError(400, 'Agency is already active'));
      }

      await agency.update({ status: 'active' });
      
      // Also activate the agency owner
      if (agency.ownerId) {
        await AgencyOwner.update(
          { isActive: true },
          { where: { id: agency.ownerId } }
        );
      }

      logger.info(`Agency owner activated agency: ${agency.email}`);
      
      res.status(200).json({
        success: true,
        message: 'Agency activated successfully',
        data: {
          id: agency.id,
          name: agency.name,
          email: agency.email,
          status: agency.status
        }
      });

    } else {
      return next(createError(403, 'Access denied. Only admin and agency owners can update status'));
    }

  } catch (error) {
    next(error);
  }
};

// Delete agency
const remove = async (req, res, next) => {
  try {
    await ensureAdmin(req.user.userId);
    const agency = await Agency.findByPk(req.params.id);
    if (!agency) return next(createError(404, 'Agency not found'));

    // Use transaction to delete both agency and agency owner
    const { sequelize } = require('../config/database');
    await sequelize.transaction(async (transaction) => {
      // Delete all agency owners associated with this agency
      await AgencyOwner.destroy({ 
        where: { agencyId: agency.id }, 
        transaction 
      });

      // Delete agency
      await agency.destroy({ transaction });
    });

    logger.info(`Agency and owner deleted: ${agency.email}`);
    res.status(200).json({ success: true, message: 'Agency deleted' });
  } catch (error) { 
    next(error); 
  }
};

module.exports = {
  create,
  confirm,
  list,
  listActive,
  getById,
  update,
  updateStatus,
  remove
};


