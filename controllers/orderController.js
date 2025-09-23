const { Order, DeliveryAgent, Product } = require('../models');
const { createOrder, updateOrderStatus, assignAgent, sendOTP, verifyOTP, cancelOrder } = require('../validations/orderValidation');
const { createError } = require('../utils/errorHandler');
const { sendEmail } = require('../config/email');
const { 
  generateOrderNumber, 
  generateOTP, 
  calculateOrderTotals, 
  validateOTP, 
  formatOrderResponse,
  NOTIFICATION_TYPES,
  createNotificationPayload
} = require('../utils/orderUtils');
const logger = require('../utils/logger');
const { Op, sequelize } = require('sequelize');

// Global socket instance (will be set from server.js)
let io;

// Set socket instance
const setSocketInstance = (socketInstance) => {
  io = socketInstance;
};

// Emit socket notification
const emitNotification = (type, data) => {
  if (io) {
    io.emit('notification', createNotificationPayload(type, data));
  }
};

// Create new order (Customer checkout)
const createOrderHandler = async (req, res, next) => {
  try {
    // Validate request body
    const { error, value } = createOrder.validate(req.body);
    if (error) {
      return next(createError(400, error.details[0].message));
    }

    // Calculate totals
    const totals = calculateOrderTotals(value.items);
    
    // Generate order number
    const orderNumber = generateOrderNumber();

    // Determine agency from the first product in the order
    // All products in an order should belong to the same agency
    let agencyId = null;
    if (value.items && value.items.length > 0) {
      const firstProductId = value.items[0].productId;
      const product = await Product.findByPk(firstProductId);
      if (product) {
        agencyId = product.agencyId;
        
        // Verify all products belong to the same agency
        for (const item of value.items) {
          const product = await Product.findByPk(item.productId);
          if (!product) {
            return next(createError(404, `Product with ID ${item.productId} not found`));
          }
          if (product.agencyId !== agencyId) {
            return next(createError(400, 'All products in an order must belong to the same agency'));
          }
        }
      } else {
        return next(createError(404, `Product with ID ${firstProductId} not found`));
      }
    }

    if (!agencyId) {
      return next(createError(400, 'Unable to determine agency for order'));
    }

    // Create order
    const order = await Order.create({
      orderNumber,
      customerName: value.customerName,
      customerEmail: value.customerEmail,
      customerPhone: value.customerPhone,
      customerAddress: value.customerAddress,
      items: value.items,
      subtotal: totals.subtotal,
      totalAmount: totals.totalAmount,
      paymentMethod: value.paymentMethod,
      status: 'pending',
      agencyId: agencyId
    });

    logger.info(`Order created: ${order.orderNumber} for agency: ${agencyId}`);

    // Emit socket notification
    emitNotification(NOTIFICATION_TYPES.ORDER_CREATED, {
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      totalAmount: order.totalAmount,
      agencyId: agencyId
    });

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: {
        order: formatOrderResponse(order)
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get all orders (Role-based filtering)
const getAllOrders = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status, search, id, agentId } = req.query;
    const offset = (page - 1) * limit;
    const userRole = req.user.role;
    const userEmail = req.user.email;
    
    // Debug logging
    console.log('🔍 Order Filtering Debug:', {
      userRole,
      userEmail,
      deliveryAgentId: req.user.deliveryAgentId
    });

    // If ID is provided, get specific order
    if (id) {
      const order = await Order.findByPk(id, {
        include: [
          {
            model: DeliveryAgent,
            as: 'DeliveryAgent',
            attributes: ['id', 'name', 'phone', 'vehicleNumber']
          }
        ]
      });
      
      if (!order) {
        return next(createError(404, 'Order not found'));
      }

      // Check if user can access this order
      if (userRole === 'customer' && order.customerEmail !== userEmail) {
        return next(createError(403, 'Access denied. You can only view your own orders'));
      }

      if (userRole === 'agent' && order.assignedAgentId !== req.user.deliveryAgentId) {
        return next(createError(403, 'Access denied. You can only view orders assigned to you'));
      }

      if (userRole === 'agency_owner' && order.agencyId !== req.user.agencyId) {
        return next(createError(403, 'Access denied. You can only view orders for your agency'));
      }

      return res.status(200).json({
        success: true,
        message: 'Order retrieved successfully',
        data: {
          order: formatOrderResponse(order, true)
        }
      });
    }

    // Build where clause based on user role
    const whereClause = {};
    
    if (status) {
      whereClause.status = status;
    }
    
    if (search) {
      whereClause[Op.or] = [
        { orderNumber: { [Op.iLike]: `%${search}%` } },
        { customerName: { [Op.iLike]: `%${search}%` } },
        { customerEmail: { [Op.iLike]: `%${search}%` } },
        { customerPhone: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // Role-based filtering
    if (userRole === 'customer') {
      // Customer can only see their own orders
      whereClause.customerEmail = userEmail;
      console.log('👤 Customer filtering by email:', userEmail);
    } else if (userRole === 'agent') {
      // Agent can only see orders assigned to them with status 'assigned'
      if (!req.user.deliveryAgentId) {
        return next(createError(400, 'Agent profile not properly linked. Please contact admin.'));
      }
      whereClause.assignedAgentId = req.user.deliveryAgentId;
      whereClause.status = 'assigned'; // Only show assigned orders to agents
      console.log('🚚 Agent filtering by assignedAgentId:', req.user.deliveryAgentId, 'and status: assigned');
    } else if (userRole === 'agency_owner') {
      // Agency owner can only see orders for their agency
      if (!req.user.agencyId) {
        return next(createError(400, 'Agency profile not properly linked. Please contact admin.'));
      }
      whereClause.agencyId = req.user.agencyId;
      console.log('🏢 Agency owner filtering by agencyId:', req.user.agencyId);
    } else if (userRole === 'admin') {
      console.log('👑 Admin - no filtering applied');
    }
    // Admin can see all orders (no additional filtering)
    
    console.log('🔍 Final whereClause:', JSON.stringify(whereClause, null, 2));

    // Filter by agent if provided (admin only)
    if (agentId && userRole === 'admin') {
      whereClause.assignedAgentId = agentId;
    }

    const orders = await Order.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: DeliveryAgent,
          as: 'DeliveryAgent',
          attributes: ['id', 'name', 'phone', 'vehicleNumber']
        },
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

    const totalPages = Math.ceil(orders.count / limit);

    res.status(200).json({
      success: true,
      message: 'Orders retrieved successfully',
      data: {
        orders: orders.rows.map(order => formatOrderResponse(order, true)),
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: orders.count,
          itemsPerPage: parseInt(limit)
        },
        userRole,
        filteredBy: userRole === 'customer' ? 'customer_email' : 
                    userRole === 'agent' ? 'assigned_agent_id' : 'all_orders'
      }
    });
  } catch (error) {
    next(error);
  }
};

// Update order status (Admin)
const updateOrderStatusHandler = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validate request body
    const { error, value } = updateOrderStatus.validate(req.body);
    if (error) {
      return next(createError(400, error.details[0].message));
    }

    const order = await Order.findByPk(id);
    if (!order) {
      return next(createError(404, 'Order not found'));
    }

    // Update order with timestamp
    const updateData = { status: value.status };
    
    if (value.status === 'confirmed' && order.status === 'pending') {
      updateData.confirmedAt = new Date();
    } else if (value.status === 'out_for_delivery' && order.status === 'assigned') {
      updateData.outForDeliveryAt = new Date();
    } else if (value.status === 'delivered' && order.status === 'out_for_delivery') {
      updateData.deliveredAt = new Date();
    } else if (value.status === 'cancelled' && order.status !== 'delivered') {
      updateData.cancelledAt = new Date();
    }

    if (value.adminNotes) updateData.adminNotes = value.adminNotes;
    if (value.agentNotes) updateData.agentNotes = value.agentNotes;

    await order.update(updateData);

    logger.info(`Order status updated: ${order.orderNumber} - ${value.status}`);

    // Send email notification
    if (value.status === 'confirmed') {
      await sendEmail(order.customerEmail, 'orderConfirmation', formatOrderResponse(order));
    } else if (value.status === 'cancelled') {
      await sendEmail(order.customerEmail, 'orderCancelled', formatOrderResponse(order), value.adminNotes);
    }

    // Emit socket notification
    emitNotification(NOTIFICATION_TYPES[`ORDER_${value.status.toUpperCase()}`], {
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: value.status
    });

    res.status(200).json({
      success: true,
      message: 'Order status updated successfully',
      data: {
        order: formatOrderResponse(order)
      }
    });
  } catch (error) {
    next(error);
  }
};

// Assign agent to order (Admin)
const assignAgentHandler = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validate request body
    const { error, value } = assignAgent.validate(req.body);
    if (error) {
      return next(createError(400, error.details[0].message));
    }

    const order = await Order.findByPk(id);
    if (!order) {
      return next(createError(404, 'Order not found'));
    }

    const agent = await DeliveryAgent.findByPk(value.agentId);
    if (!agent) {
      return next(createError(404, 'Delivery agent not found'));
    }

    // Check if agent belongs to the same agency as the order
    if (agent.agencyId !== order.agencyId) {
      return next(createError(400, 'Agent must belong to the same agency as the order'));
    }

    // Update order
    await order.update({
      assignedAgentId: value.agentId,
      status: 'assigned',
      assignedAt: new Date()
    });

    logger.info(`Order assigned to agent: ${order.orderNumber} - ${agent.name}`);

    // Send email notification
    await sendEmail(order.customerEmail, 'orderAssigned', formatOrderResponse(order), agent);

    // Emit socket notification
    emitNotification(NOTIFICATION_TYPES.ORDER_ASSIGNED, {
      orderId: order.id,
      orderNumber: order.orderNumber,
      agentId: agent.id,
      agentName: agent.name
    });

    res.status(200).json({
      success: true,
      message: 'Order assigned to agent successfully',
      data: { 
        order: formatOrderResponse(order),
        agent: {
          id: agent.id,
          name: agent.name,
          phone: agent.phone,
          vehicleNumber: agent.vehicleNumber
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Send OTP for delivery (Agent)
const sendOTPHandler = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validate request body
    const { error } = sendOTP.validate({ orderId: id });
    if (error) {
      return next(createError(400, error.details[0].message));
    }

    const order = await Order.findByPk(id);
    if (!order) {
      return next(createError(404, 'Order not found'));
    }

    if (order.status !== 'assigned' && order.status !== 'out_for_delivery') {
      return next(createError(400, 'Order is not ready for delivery'));
    }

    // Generate OTP
    const otp = generateOTP();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Update order
    await order.update({
      deliveryOTP: otp,
      otpExpiresAt,
      status: 'out_for_delivery',
      outForDeliveryAt: new Date()
    });

    logger.info(`OTP sent for order: ${order.orderNumber}`);

    // Send email with OTP
    await sendEmail(order.customerEmail, 'deliveryOTP', { ...formatOrderResponse(order), otp });

    // Emit socket notification
    emitNotification(NOTIFICATION_TYPES.OTP_SENT, {
      orderId: order.id,
      orderNumber: order.orderNumber
    });

    res.status(200).json({
      success: true,
      message: 'OTP sent successfully',
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        otpExpiresAt
      }
    });
  } catch (error) {
    next(error);
  }
};

// Verify OTP and complete delivery (Agent)
const verifyOTPHandler = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validate request body
    const { error, value } = verifyOTP.validate({ orderId: id, ...req.body });
    if (error) {
      return next(createError(400, error.details[0].message));
    }

    const order = await Order.findByPk(id);
    if (!order) {
      return next(createError(404, 'Order not found'));
    }

    if (order.status !== 'out_for_delivery') {
      return next(createError(400, 'Order is not out for delivery'));
    }

    // Validate OTP
    if (!validateOTP(value.otp, order.deliveryOTP, order.otpExpiresAt)) {
      return next(createError(400, 'Invalid or expired OTP'));
    }

    // Update order
    await order.update({
      status: 'delivered',
      deliveredAt: new Date(),
      deliveryOTP: null,
      otpExpiresAt: null
    });

    logger.info(`Order delivered: ${order.orderNumber}`);

    // Send email notification
    await sendEmail(order.customerEmail, 'orderDelivered', formatOrderResponse(order));

    // Emit socket notification
    emitNotification(NOTIFICATION_TYPES.ORDER_DELIVERED, {
      orderId: order.id,
      orderNumber: order.orderNumber
    });

    res.status(200).json({
      success: true,
      message: 'Order delivered successfully',
      data: {
        order: formatOrderResponse(order)
      }
    });
  } catch (error) {
    next(error);
  }
};

// Cancel order (Admin)
const cancelOrderHandler = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validate request body
    const { error, value } = cancelOrder.validate(req.body);
    if (error) {
      return next(createError(400, error.details[0].message));
    }

    const order = await Order.findByPk(id);
    if (!order) {
      return next(createError(404, 'Order not found'));
    }

    if (order.status === 'delivered') {
      return next(createError(400, 'Cannot cancel delivered order'));
    }

    // Update order
    await order.update({
      status: 'cancelled',
      cancelledAt: new Date(),
      adminNotes: value.reason
    });

    logger.info(`Order cancelled: ${order.orderNumber}`);

    // Send email notification
    await sendEmail(order.customerEmail, 'orderCancelled', formatOrderResponse(order), value.reason);

    // Emit socket notification
    emitNotification(NOTIFICATION_TYPES.ORDER_CANCELLED, {
      orderId: order.id,
      orderNumber: order.orderNumber,
      reason: value.reason
    });

    res.status(200).json({
      success: true,
      message: 'Order cancelled successfully',
      data: {
        order: formatOrderResponse(order)
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get orders by status (Role-based filtering)
const getOrdersByStatus = async (req, res, next) => {
  try {
    const { status } = req.params;
    const userRole = req.user.role;
    const userEmail = req.user.email;

    if (!['pending', 'confirmed', 'assigned', 'out_for_delivery', 'delivered', 'cancelled'].includes(status)) {
      return next(createError(400, 'Invalid status'));
    }

    // Build where clause based on user role
    const whereClause = { status };
    
    if (userRole === 'customer') {
      // Customer can only see their own orders
      whereClause.customerEmail = userEmail;
    } else if (userRole === 'agent') {
      // Agent can only see orders assigned to them
      if (!req.user.deliveryAgentId) {
        return next(createError(400, 'Agent profile not properly linked. Please contact admin.'));
      }
      whereClause.assignedAgentId = req.user.deliveryAgentId;
    }
    // Admin can see all orders (no additional filtering)

    const orders = await Order.findAll({
      where: whereClause,
      include: [
        {
          model: DeliveryAgent,
          as: 'DeliveryAgent',
          attributes: ['id', 'name', 'phone', 'vehicleNumber']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json({
      success: true,
      message: `${status} orders retrieved successfully`,
      data: {
        orders: orders.map(order => formatOrderResponse(order, true)),
        userRole,
        filteredBy: userRole === 'customer' ? 'customer_email' : 
                    userRole === 'agent' ? 'assigned_agent_id' : 'all_orders'
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get customer orders summary (Customer only)
const getCustomerOrdersSummary = async (req, res, next) => {
  try {
    const userRole = req.user.role;
    const userEmail = req.user.email;

    if (userRole !== 'customer') {
      return next(createError(403, 'Access denied. This endpoint is for customers only'));
    }

    // Get orders count by status for this customer
    const ordersSummary = await Order.findAll({
      where: { customerEmail: userEmail },
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['status'],
      raw: true
    });

    // Get total orders and total amount
    const totalOrders = await Order.count({
      where: { customerEmail: userEmail }
    });

    const totalAmount = await Order.sum('totalAmount', {
      where: { customerEmail: userEmail }
    });

    // Format summary
    const summary = {
      totalOrders,
      totalAmount: totalAmount || 0,
      byStatus: {}
    };

    ordersSummary.forEach(item => {
      summary.byStatus[item.status] = parseInt(item.count);
    });

    res.status(200).json({
      success: true,
      message: 'Customer orders summary retrieved successfully',
      data: {
        summary,
        customerEmail: userEmail
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get agent delivery history
const getAgentDeliveryHistory = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status, startDate, endDate, customerName } = req.query;
    const offset = (page - 1) * limit;
    const userRole = req.user.role;
    
    // Only agents can access this endpoint
    if (userRole !== 'agent') {
      return next(createError(403, 'Access denied. Only agents can view delivery history.'));
    }

    // Check if agent profile is properly linked
    if (!req.user.deliveryAgentId) {
      return next(createError(400, 'Agent profile not properly linked. Please contact admin.'));
    }

    // Build where clause for agent's delivered orders
    const whereClause = {
      assignedAgentId: req.user.deliveryAgentId,
      status: { [Op.in]: ['delivered', 'cancelled'] } // Only show completed orders
    };

    // Filter by status if provided
    if (status && ['delivered', 'cancelled'].includes(status)) {
      whereClause.status = status;
    }

    // Filter by date range if provided
    if (startDate || endDate) {
      whereClause.deliveredAt = {};
      if (startDate) {
        whereClause.deliveredAt[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        whereClause.deliveredAt[Op.lte] = new Date(endDate);
      }
    }

    // Filter by customer name if provided
    if (customerName) {
      whereClause.customerName = { [Op.iLike]: `%${customerName}%` };
    }

    console.log('🔍 Agent History Filtering:', {
      agentId: req.user.deliveryAgentId,
      whereClause: JSON.stringify(whereClause, null, 2)
    });

    const orders = await Order.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: DeliveryAgent,
          as: 'DeliveryAgent',
          attributes: ['id', 'name', 'phone', 'vehicleNumber']
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['deliveredAt', 'DESC'], ['cancelledAt', 'DESC'], ['createdAt', 'DESC']]
    });

    const totalPages = Math.ceil(orders.count / limit);

    // Calculate summary statistics
    const deliveredCount = await Order.count({
      where: {
        assignedAgentId: req.user.deliveryAgentId,
        status: 'delivered'
      }
    });

    const cancelledCount = await Order.count({
      where: {
        assignedAgentId: req.user.deliveryAgentId,
        status: 'cancelled'
      }
    });

    const totalEarnings = await Order.sum('totalAmount', {
      where: {
        assignedAgentId: req.user.deliveryAgentId,
        status: 'delivered'
      }
    });

    res.status(200).json({
      success: true,
      message: 'Agent delivery history retrieved successfully',
      data: {
        orders: orders.rows.map(order => formatOrderResponse(order, true)),
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: orders.count,
          itemsPerPage: parseInt(limit)
        },
        summary: {
          totalDelivered: deliveredCount,
          totalCancelled: cancelledCount,
          totalEarnings: totalEarnings || 0,
          totalOrders: deliveredCount + cancelledCount
        },
        agent: {
          id: req.user.deliveryAgentId,
          name: orders.rows[0]?.DeliveryAgent?.name || 'Unknown',
          phone: orders.rows[0]?.DeliveryAgent?.phone || 'Unknown',
          vehicleNumber: orders.rows[0]?.DeliveryAgent?.vehicleNumber || 'Unknown'
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get agent delivery statistics
const getAgentDeliveryStats = async (req, res, next) => {
  try {
    const { period = 'month' } = req.query; // day, week, month, year
    const userRole = req.user.role;
    
    // Only agents can access this endpoint
    if (userRole !== 'agent') {
      return next(createError(403, 'Access denied. Only agents can view delivery statistics.'));
    }

    // Check if agent profile is properly linked
    if (!req.user.deliveryAgentId) {
      return next(createError(400, 'Agent profile not properly linked. Please contact admin.'));
    }

    // Calculate date range based on period
    const now = new Date();
    let startDate;
    
    switch (period) {
      case 'day':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // Get statistics for the period
    const deliveredThisPeriod = await Order.count({
      where: {
        assignedAgentId: req.user.deliveryAgentId,
        status: 'delivered',
        deliveredAt: { [Op.gte]: startDate }
      }
    });

    const cancelledThisPeriod = await Order.count({
      where: {
        assignedAgentId: req.user.deliveryAgentId,
        status: 'cancelled',
        cancelledAt: { [Op.gte]: startDate }
      }
    });

    const earningsThisPeriod = await Order.sum('totalAmount', {
      where: {
        assignedAgentId: req.user.deliveryAgentId,
        status: 'delivered',
        deliveredAt: { [Op.gte]: startDate }
      }
    });

    // Get all delivered orders for the period with full details
    const deliveredOrders = await Order.findAll({
      where: {
        assignedAgentId: req.user.deliveryAgentId,
        status: 'delivered',
        deliveredAt: { [Op.gte]: startDate }
      },
      include: [
        {
          model: DeliveryAgent,
          as: 'DeliveryAgent',
          attributes: ['id', 'name', 'phone', 'vehicleNumber']
        }
      ],
      order: [['deliveredAt', 'DESC']]
    });

    // Get cancelled orders for the period with full details
    const cancelledOrders = await Order.findAll({
      where: {
        assignedAgentId: req.user.deliveryAgentId,
        status: 'cancelled',
        cancelledAt: { [Op.gte]: startDate }
      },
      include: [
        {
          model: DeliveryAgent,
          as: 'DeliveryAgent',
          attributes: ['id', 'name', 'phone', 'vehicleNumber']
        }
      ],
      order: [['cancelledAt', 'DESC']]
    });

    // Group by date manually with full order details
    const dailyStats = {};
    deliveredOrders.forEach(order => {
      const date = order.deliveredAt.toISOString().split('T')[0];
      if (!dailyStats[date]) {
        dailyStats[date] = { 
          count: 0, 
          earnings: 0, 
          orders: [] 
        };
      }
      dailyStats[date].count += 1;
      dailyStats[date].earnings += parseFloat(order.totalAmount);
      dailyStats[date].orders.push(formatOrderResponse(order, true));
    });

    // Convert to array format with full details
    const dailyBreakdown = Object.entries(dailyStats).map(([date, stats]) => ({
      date,
      count: stats.count.toString(),
      earnings: stats.earnings.toFixed(2),
      orders: stats.orders
    }));

    res.status(200).json({
      success: true,
      message: 'Agent delivery statistics retrieved successfully',
      data: {
        period,
        periodStart: startDate,
        periodEnd: now,
        stats: {
          delivered: deliveredThisPeriod,
          cancelled: cancelledThisPeriod,
          earnings: earningsThisPeriod || 0,
          totalOrders: deliveredThisPeriod + cancelledThisPeriod
        },
        dailyBreakdown: dailyBreakdown,
        deliveredOrders: deliveredOrders.map(order => formatOrderResponse(order, true)),
        cancelledOrders: cancelledOrders.map(order => formatOrderResponse(order, true))
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  setSocketInstance,
  createOrderHandler,
  getAllOrders,
  updateOrderStatusHandler,
  assignAgentHandler,
  sendOTPHandler,
  verifyOTPHandler,
  cancelOrderHandler,
  getOrdersByStatus,
  getCustomerOrdersSummary,
  getAgentDeliveryHistory,
  getAgentDeliveryStats
};
