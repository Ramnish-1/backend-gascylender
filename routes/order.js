const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authenticate } = require('../middleware/auth');
const uploadDeliveryProof = require('../middleware/deliveryProofUpload');

// Customer routes (no authentication required for checkout)
router.post('/checkout', orderController.createOrderHandler);

// Admin/Agent routes (require authentication)
router.use(authenticate);
router.get('/', orderController.getAllOrders);
router.get('/:id', orderController.getOrderById);
router.get('/status/:status', orderController.getOrdersByStatus);

// Customer-specific routes
router.get('/customer/summary', orderController.getCustomerOrdersSummary);

// Agent-specific routes
router.get('/agent/history', orderController.getAgentDeliveryHistory);
router.get('/agent/stats', orderController.getAgentDeliveryStats);

// Product routes - REMOVED (these belong in product routes, not order routes)

// Order management routes
router.put('/:id/status', orderController.updateOrderStatusHandler);
router.put('/:id/assign', orderController.assignAgentHandler);
router.post('/:id/send-otp', orderController.sendOTPHandler);
router.post('/:id/verify-otp', uploadDeliveryProof.single('deliveryProof'), orderController.verifyOTPHandler);
router.put('/:id/cancel', orderController.cancelOrderHandler);
router.put('/:id/return', orderController.returnOrderHandler);

module.exports = router;
