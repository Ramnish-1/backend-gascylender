const app = require('./app');
const config = require('./config/database');
const logger = require('./utils/logger');
const { Server } = require('socket.io');
const http = require('http');
const orderController = require('./controllers/orderController');

const PORT = process.env.PORT || 5000;

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Set socket instance in order controller
orderController.setSocketInstance(io);

// Socket connection handling
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);

  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });

  // Join admin room
  socket.on('join-admin', () => {
    socket.join('admin');
    logger.info(`Admin joined: ${socket.id}`);
  });

  // Join agent room
  socket.on('join-agent', (agentId) => {
    socket.join(`agent-${agentId}`);
    logger.info(`Agent ${agentId} joined: ${socket.id}`);
  });
});

// Test database connection
config.sequelize.authenticate()
  .then(() => {
    logger.info('Database connection established successfully.');
    
    // Sync database (in development)
    if (process.env.NODE_ENV === 'development') {
      return config.sequelize.sync({ alter: true });
    }
  })
  .then(() => {
    // Start server
    server.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV}`);
      logger.info(`Socket.IO server initialized`);
    });
  })
  .catch((error) => {
    logger.error('Unable to connect to the database:', error);
    process.exit(1);
  });

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Promise Rejection:', err);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});
