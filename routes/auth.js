const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Public routes
router.post('/login', authController.login); // Admin login with email/password
router.post('/setup', authController.setupUser); // First time setup (Admin)
router.post('/request-otp', authController.requestOTP); // Request OTP for customer/agent
router.post('/verify-otp', authController.verifyOTP); // Verify OTP for customer/agent

// Protected routes
router.post('/complete-profile/customer', authenticate, authController.completeCustomerProfile); // Complete customer profile
router.post('/complete-profile/agent', authenticate, authController.completeAgentProfile); // Complete agent profile

// Protected routes
router.get('/profile', authenticate, authController.getProfile);
router.put('/profile', authenticate, upload.single('image'), authController.updateProfile);
router.put('/agent/profile', authenticate, upload.single('image'), authController.updateAgentProfile); // Agent specific profile update
router.put('/agent/profile/comprehensive', authenticate, upload.single('image'), authController.updateAgentProfileComplete); // Agent comprehensive profile update
router.post('/logout', authenticate, authController.logout);
router.delete('/account', authenticate, authController.deleteAccount); // Delete user account

// Admin only routes
router.get('/customers', authenticate, authController.getAllCustomers); // Get all customers (Admin only)

module.exports = router;
