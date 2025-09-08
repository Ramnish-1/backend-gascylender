const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
require('dotenv').config();

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration - Allow all origins
app.use(cors({
  origin: '*', // Allow all origins
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: false // Set to false when origin is '*'
}));

// Compression middleware
app.use(compression());

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use('/uploads', express.static('uploads'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Test endpoint to verify routing
app.get('/test', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Root test route working',
    timestamp: new Date().toISOString()
  });
});

// API routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/delivery-agents', require('./routes/deliveryAgent'));

// Product routes with debugging
console.log('Loading product routes...');
try {
  const productRoutes = require('./routes/product');
  console.log('Product routes loaded successfully:', typeof productRoutes);
  console.log('Product routes object:', productRoutes);
  app.use('/api/products', productRoutes);
  console.log('Product routes registered at /api/products');
} catch (error) {
  console.error('Error loading product routes:', error);
  process.exit(1);
}

app.use('/api/orders', require('./routes/order'));
app.use('/api/addresses', require('./routes/address'));

// 404 handler
app.use(require('./middleware/notFound'));

// Error handler
app.use(require('./middleware/errorHandler'));

module.exports = app;
