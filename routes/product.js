const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { authenticate } = require('../middleware/auth');
const upload = require('../middleware/upload');

// All routes require authentication
router.use(authenticate);

// Create a new product (supports multiple images via form-data field "images")
router.post('/', upload.array('images', 10), productController.createProductHandler);

// Get all products (comprehensive endpoint)
// Supports: pagination, search, status filter, and getting by ID
router.get('/', productController.getAllProducts);



// Get products by status (MUST come before /:id route)
router.get('/status/:status', productController.getProductsByStatus);

// Get a single product by ID (MUST come last among GET routes)
router.get('/:id', productController.getProductById);

// Update product (supports multiple images via form-data field "images")
router.put('/:id', upload.array('images', 10), productController.updateProductHandler);

// Update product status only
router.patch('/:id/status', productController.updateProductStatus);

// Delete product
router.delete('/:id', productController.deleteProduct);

module.exports = router;
