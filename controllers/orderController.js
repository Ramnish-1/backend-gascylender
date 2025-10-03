const { Order, DeliveryAgent, Product } = require('../models');
const { createOrder, updateOrderStatus, assignAgent, sendOTP, verifyOTP, cancelOrder, returnOrder, markPaymentReceived } = require('../validations/orderValidation');
const { createError } = require('../utils/errorHandler');
const { sendEmail } = require('../config/email');
const { 
  generateOrderNumber, 
  generateOTP, 
  calculateOrderTotals, 
  validateOTP, 
  formatOrderResponse,
  restoreStockToAgency,
  NOTIFICATION_TYPES,
  createNotificationPayload
} = require('../utils/orderUtils');
const logger = require('../utils/logger');
const { Op, sequelize } = require('sequelize');

// Get socket service instance
const getSocketService = () => {
  return global.socketService;
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

    // Use the specified agency from the request
    const agencyId = value.agencyId;
    
    // Verify the agency exists and is active
    const Agency = require('../models/Agency');
    const agency = await Agency.findByPk(agencyId);
    if (!agency) {
      return next(createError(404, `Agency with ID ${agencyId} not found`));
    }
    if (agency.status !== 'active') {
      return next(createError(400, `Agency ${agency.name} is not active`));
    }
      
    // Verify all products are available in the specified agency
    if (value.items && value.items.length > 0) {
      const AgencyInventory = require('../models/AgencyInventory');
      
      for (const item of value.items) {
        const product = await Product.findByPk(item.productId);
        if (!product) {
          return next(createError(404, `Product with ID ${item.productId} not found`));
        }
        
        const inventory = await AgencyInventory.findOne({
          where: { 
            productId: item.productId, 
            agencyId: agencyId,
            isActive: true 
          }
        });
        
        if (!inventory) {
          return next(createError(400, `Product ${product.productName} is not available in the selected agency`));
        }
        
        // Check stock availability - handle both product-level and variant-level stock
        let availableStock = inventory.stock;
        let stockMessage = `product ${product.productName}`;
        
        // If item has variant information, check variant-specific stock
        if (item.variantLabel && inventory.agencyVariants && Array.isArray(inventory.agencyVariants)) {
          const variant = inventory.agencyVariants.find(v => v.label === item.variantLabel);
          if (variant) {
            availableStock = variant.stock || 0;
            stockMessage = `variant ${item.variantLabel} of ${product.productName}`;
          }
        }
        
        if (availableStock < item.quantity) {
          return next(createError(400, `Insufficient stock for ${stockMessage}. Available: ${availableStock}, Requested: ${item.quantity}`));
        }
      }
    }

    // Create order
    const order = await Order.create({
      orderNumber,
      customerName: value.customerName,
      customerEmail: value.customerEmail,
      customerPhone: value.customerPhone,
      customerAddress: value.customerAddress || null,
      deliveryMode: value.deliveryMode,
      items: value.items,
      subtotal: totals.subtotal,
      totalAmount: totals.totalAmount,
      paymentMethod: value.paymentMethod,
      status: 'pending',
      agencyId: agencyId
    });

    // Reduce stock in agency inventory
    const AgencyInventory = require('../models/AgencyInventory');
    for (const item of value.items) {
      // Get current inventory to check if we need to update variants
      const inventory = await AgencyInventory.findOne({
        where: {
          productId: item.productId,
          agencyId: agencyId
        }
      });
      
      if (inventory) {
        // If item has variant information, update variant stock
        if (item.variantLabel && inventory.agencyVariants && Array.isArray(inventory.agencyVariants)) {
          const updatedVariants = inventory.agencyVariants.map(variant => {
            if (variant.label === item.variantLabel) {
              return {
                ...variant,
                stock: Math.max(0, (variant.stock || 0) - item.quantity)
              };
            }
            return variant;
          });
          
          await inventory.update({
            agencyVariants: updatedVariants
          });
        } else {
          // Update product-level stock
          await AgencyInventory.decrement('stock', {
            by: item.quantity,
            where: {
              productId: item.productId,
              agencyId: agencyId
            }
          });
        }
      }
    }

    logger.info(`Order created: ${order.orderNumber} for agency: ${agencyId}`);

    // Emit socket notification
    const socketService = getSocketService();
    if (socketService) {
      socketService.emitOrderCreated({
        orderId: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        totalAmount: order.totalAmount,
        agencyId: agencyId,
        status: order.status
      });
    }

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
    const { page = 1, limit = 10, status, search, id, agentId, startDate, endDate } = req.query;
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
          },
          {
            model: require('../models').Agency,
            as: 'Agency',
            attributes: ['id', 'name', 'email', 'phone', 'city', 'status']
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

    // Date filtering
    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) {
        whereClause.createdAt[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        // Add 23:59:59 to endDate to include the entire day
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        whereClause.createdAt[Op.lte] = endDateTime;
      }
    }

    // Role-based filtering
    if (userRole === 'customer') {
      // Customer can only see their own orders
      whereClause.customerEmail = userEmail;
      console.log('👤 Customer filtering by email:', userEmail);
    } else if (userRole === 'agent') {
      // Agent can see orders assigned to them
      if (!req.user.deliveryAgentId) {
        return next(createError(400, 'Agent profile not properly linked. Please contact admin.'));
      }
      whereClause.assignedAgentId = req.user.deliveryAgentId;
      
      // If no specific status is requested, show active orders (assigned + out_for_delivery)
      // If specific status is requested, respect that filter
      if (!status) {
        whereClause.status = { [Op.in]: ['assigned', 'out_for_delivery'] };
        console.log('🚚 Agent filtering by assignedAgentId:', req.user.deliveryAgentId, 'and status: assigned, out_for_delivery (default)');
      } else {
        console.log('🚚 Agent filtering by assignedAgentId:', req.user.deliveryAgentId, 'and specific status:', status);
      }
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
      // Auto-update payment status to "paid" if order is delivered and payment received
      if (order.paymentReceived === true) {
        updateData.paymentStatus = 'paid';
      }
    } else if (value.status === 'cancelled' && order.status !== 'delivered') {
      updateData.cancelledAt = new Date();
      
      // Track who cancelled the order
      let cancelledBy = 'system';
      let cancelledById = null;
      let cancelledByName = 'System';

      if (req.user) {
        switch (req.user.role) {
          case 'admin':
            cancelledBy = 'admin';
            cancelledById = req.user.id;
            cancelledByName = req.user.name || req.user.email;
            break;
          case 'agency':
            cancelledBy = 'agency';
            cancelledById = req.user.id;
            cancelledByName = req.user.name || req.user.email;
            break;
          case 'customer':
            cancelledBy = 'customer';
            cancelledById = req.user.id;
            cancelledByName = req.user.name || req.user.email;
            break;
        }
      }
      
      updateData.cancelledBy = cancelledBy;
      updateData.cancelledById = cancelledById;
      updateData.cancelledByName = cancelledByName;
    }

    if (value.adminNotes) updateData.adminNotes = value.adminNotes;
    if (value.agentNotes) updateData.agentNotes = value.agentNotes;

    await order.update(updateData);

    // Restore stock when order is cancelled via status update
    if (value.status === 'cancelled') {
      await restoreStockToAgency(order);
      
      const cancelledByName = updateData.cancelledByName || 'System';
      const cancelledBy = updateData.cancelledBy || 'system';
      logger.info(`Order cancelled: ${order.orderNumber} by ${cancelledByName} (${cancelledBy}) - Stock restored to agency inventory`);
    } else {
      logger.info(`Order status updated: ${order.orderNumber} - ${value.status}`);
    }

    // Send email notification
    if (value.status === 'confirmed') {
      await sendEmail(order.customerEmail, 'orderConfirmation', formatOrderResponse(order));
    } else if (value.status === 'cancelled') {
      await sendEmail(order.customerEmail, 'orderCancelled', formatOrderResponse(order), value.adminNotes);
    }

    // Emit socket notification
    const socketService = getSocketService();
    if (socketService) {
      socketService.emitOrderStatusUpdated({
        orderId: order.id,
        orderNumber: order.orderNumber,
        status: value.status,
        customerEmail: order.customerEmail,
        agencyId: order.agencyId,
        assignedAgentId: order.assignedAgentId
      });
    }

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
    const socketService = getSocketService();
    if (socketService) {
      socketService.emitOrderAssigned({
        orderId: order.id,
        orderNumber: order.orderNumber,
        agentId: agent.id,
        agentName: agent.name,
        assignedAgentId: agent.id,
        customerEmail: order.customerEmail,
        agencyId: order.agencyId
      });
    }

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
    const socketService = getSocketService();
    if (socketService) {
      socketService.emitOrderStatusUpdated({
        orderId: order.id,
        orderNumber: order.orderNumber,
        status: 'out_for_delivery',
        customerEmail: order.customerEmail,
        agencyId: order.agencyId,
        assignedAgentId: order.assignedAgentId,
        otpSent: true
      });
    }

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

    // Prepare update data
    const updateData = {
      status: 'delivered',
      deliveredAt: new Date(),
      deliveryOTP: null,
      otpExpiresAt: null
    };

    // Add delivery note if provided
    if (value.deliveryNote) {
      updateData.deliveryNote = value.deliveryNote;
    }

    // Add payment received status if provided
    if (value.paymentReceived !== undefined) {
      updateData.paymentReceived = value.paymentReceived;
    }

    // Add delivery proof image if uploaded
    if (req.file && req.file.path) {
      updateData.deliveryProofImage = req.file.path;
    }

    // Auto-update payment status to "paid" if order is delivered and payment received
    if (value.paymentReceived === true) {
      updateData.paymentStatus = 'paid';
    }

    // Update order
    await order.update(updateData);

    logger.info(`Order delivered: ${order.orderNumber} with delivery proof: ${req.file ? 'Yes' : 'No'}`);

    // Send email notification
    await sendEmail(order.customerEmail, 'orderDelivered', formatOrderResponse(order));

    // Emit socket notification
    const socketService = getSocketService();
    if (socketService) {
      socketService.emitOrderDelivered({
        orderId: order.id,
        orderNumber: order.orderNumber,
        deliveryProof: req.file ? true : false,
        paymentReceived: value.paymentReceived || false,
        customerEmail: order.customerEmail,
        agencyId: order.agencyId,
        assignedAgentId: order.assignedAgentId
      });
    }

    res.status(200).json({
      success: true,
      message: 'Order delivered successfully',
      data: {
        order: formatOrderResponse(order),
        deliveryProof: req.file ? {
          url: req.file.path,
          publicId: req.file.filename
        } : null,
        deliveryNote: value.deliveryNote || null,
        paymentReceived: value.paymentReceived || false
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

    // Determine who cancelled the order
    let cancelledBy = 'system';
    let cancelledById = null;
    let cancelledByName = 'System';

    if (req.user) {
      switch (req.user.role) {
        case 'admin':
          cancelledBy = 'admin';
          cancelledById = req.user.id;
          cancelledByName = req.user.name || req.user.email;
          break;
        case 'agency':
          cancelledBy = 'agency';
          cancelledById = req.user.id;
          cancelledByName = req.user.name || req.user.email;
          break;
        case 'customer':
          cancelledBy = 'customer';
          cancelledById = req.user.id;
          cancelledByName = req.user.name || req.user.email;
          break;
      }
    }

    // Update order
    await order.update({
      status: 'cancelled',
      cancelledAt: new Date(),
      cancelledBy: cancelledBy,
      cancelledById: cancelledById,
      cancelledByName: cancelledByName,
      adminNotes: value.reason
    });

    // Restore stock in agency inventory when order is cancelled
    await restoreStockToAgency(order);

    logger.info(`Order cancelled: ${order.orderNumber} by ${cancelledByName} (${cancelledBy}) - Stock restored to agency inventory`);

    // Send email notification
    await sendEmail(order.customerEmail, 'orderCancelled', formatOrderResponse(order), value.reason);

    // Emit socket notification
    const socketService = getSocketService();
    if (socketService) {
      socketService.emitOrderStatusUpdated({
        orderId: order.id,
        orderNumber: order.orderNumber,
        status: 'cancelled',
        customerEmail: order.customerEmail,
        agencyId: order.agencyId,
        assignedAgentId: order.assignedAgentId,
        reason: value.reason
      });
    }

    res.status(200).json({
      success: true,
      message: 'Order cancelled successfully',
      data: {
        order: formatOrderResponse(order),
        cancellationInfo: {
          cancelledBy: cancelledBy,
          cancelledByName: cancelledByName,
          cancelledAt: new Date(),
          reason: value.reason
        }
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
        },
        {
          model: require('../models').Agency,
          as: 'Agency',
          attributes: ['id', 'name', 'email', 'phone', 'city', 'status']
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
        },
        {
          model: require('../models').Agency,
          as: 'Agency',
          attributes: ['id', 'name', 'email', 'phone', 'city', 'status']
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

    // Get current active orders (assigned + out_for_delivery)
    const assignedOrders = await Order.count({
      where: {
        assignedAgentId: req.user.deliveryAgentId,
        status: 'assigned'
      }
    });

    const outForDeliveryOrders = await Order.count({
      where: {
        assignedAgentId: req.user.deliveryAgentId,
        status: 'out_for_delivery'
      }
    });

    // Get total delivered orders (all time, not just period)
    const totalDeliveredOrders = await Order.count({
      where: {
        assignedAgentId: req.user.deliveryAgentId,
        status: 'delivered'
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
        },
        {
          model: require('../models').Agency,
          as: 'Agency',
          attributes: ['id', 'name', 'email', 'phone', 'city', 'status']
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
        },
        {
          model: require('../models').Agency,
          as: 'Agency',
          attributes: ['id', 'name', 'email', 'phone', 'city', 'status']
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
          // Period-based stats
          deliveredThisPeriod: deliveredThisPeriod,
          cancelledThisPeriod: cancelledThisPeriod,
          earningsThisPeriod: earningsThisPeriod || 0,
          totalOrdersThisPeriod: deliveredThisPeriod + cancelledThisPeriod,
          
          // Current active orders
          assignedOrders: assignedOrders,
          outForDeliveryOrders: outForDeliveryOrders,
          totalActiveOrders: assignedOrders + outForDeliveryOrders,
          
          // All-time stats
          totalDeliveredOrders: totalDeliveredOrders
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

const returnOrderHandler = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validate request body
    const { error, value } = returnOrder.validate(req.body);
    if (error) {
      return next(createError(400, error.details[0].message));
    }

    const order = await Order.findByPk(id);
    if (!order) {
      return next(createError(404, 'Order not found'));
    }

    // Only delivered orders can be returned
    if (order.status !== 'delivered') {
      return next(createError(400, 'Only delivered orders can be returned'));
    }

    // Check permissions - customer can only return their own orders
    if (req.user.role === 'customer' && order.customerEmail !== req.user.email) {
      return next(createError(403, 'Access denied. You can only return your own orders'));
    }

    // Determine who returned the order
    let returnedBy = 'system';
    let returnedById = null;
    let returnedByName = 'System';

    if (req.user) {
      switch (req.user.role) {
        case 'admin':
          returnedBy = 'admin';
          returnedById = req.user.id;
          returnedByName = req.user.name || req.user.email;
          break;
        case 'agency':
          returnedBy = 'agency';
          returnedById = req.user.id;
          returnedByName = req.user.name || req.user.email;
          break;
        case 'customer':
          returnedBy = 'customer';
          returnedById = req.user.id;
          returnedByName = req.user.name || req.user.email;
          break;
      }
    }

    // Update order
    await order.update({
      status: 'returned',
      returnedAt: new Date(),
      returnedBy: returnedBy,
      returnedById: returnedById,
      returnedByName: returnedByName,
      returnReason: value.reason,
      adminNotes: value.adminNotes || order.adminNotes
    });

    // Restore stock in agency inventory when order is returned
    await restoreStockToAgency(order);

    logger.info(`Order returned: ${order.orderNumber} by ${returnedByName} (${returnedBy}) - Stock restored to agency inventory`);

    // Send email notification
    await sendEmail(order.customerEmail, 'orderReturned', formatOrderResponse(order), value.reason);

    // Emit socket notification
    const socketService = getSocketService();
    if (socketService) {
      socketService.emitOrderStatusUpdated({
        orderId: order.id,
        orderNumber: order.orderNumber,
        status: 'returned',
        customerEmail: order.customerEmail,
        agencyId: order.agencyId,
        assignedAgentId: order.assignedAgentId,
        reason: value.reason
      });
    }

    res.status(200).json({
      success: true,
      message: 'Order returned successfully',
      data: {
        order: formatOrderResponse(order),
        returnInfo: {
          returnedBy: returnedBy,
          returnedByName: returnedByName,
          returnedAt: new Date(),
          reason: value.reason
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

const getOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Find the order with all related data
    const order = await Order.findByPk(id, {
      include: [
        {
          model: require('../models/Agency'),
          as: 'Agency',
          attributes: ['id', 'name', 'email', 'phone', 'city', 'status']
        },
        {
          model: require('../models/DeliveryAgent'),
          as: 'DeliveryAgent',
          attributes: ['id', 'name', 'phone', 'vehicleNumber']
        }
      ]
    });

    if (!order) {
      return next(createError(404, 'Order not found'));
    }

    // Check permissions based on user role
    const userRole = req.user.role;
    const userId = req.user.id;

    // Admin can see all orders
    if (userRole === 'admin') {
      // No additional filtering needed
    }
    // Agency can only see their own orders
    else if (userRole === 'agency') {
      if (order.agencyId !== userId) {
        return next(createError(403, 'Access denied. You can only view orders for your agency'));
      }
    }
    // Customer can only see their own orders
    else if (userRole === 'customer') {
      if (order.customerEmail !== req.user.email) {
        return next(createError(403, 'Access denied. You can only view your own orders'));
      }
    }
    // Delivery agent can only see orders assigned to them
    else if (userRole === 'delivery_agent') {
      if (order.assignedAgentId !== req.user.deliveryAgentId) {
        return next(createError(403, 'Access denied. You can only view orders assigned to you'));
      }
    }

    res.status(200).json({
      success: true,
      data: {
        order: formatOrderResponse(order, true) // Include agent information
      }
    });

  } catch (error) {
    next(error);
  }
};

// Mark payment received for pickup orders (Admin/Agency Owner)
const markPaymentReceivedHandler = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validate request body
    const { error, value } = markPaymentReceived.validate(req.body);
    if (error) {
      return next(createError(400, error.details[0].message));
    }

    const order = await Order.findByPk(id);
    if (!order) {
      return next(createError(404, 'Order not found'));
    }

    // Check permissions
    const userRole = req.user.role;
    
    // Only admin and agency owners can mark payment received
    if (userRole !== 'admin' && userRole !== 'agency_owner') {
      return next(createError(403, 'Access denied. Only admin and agency owners can mark payment received.'));
    }

    // Agency owners can only mark payment for their own agency's orders
    if (userRole === 'agency_owner' && order.agencyId !== req.user.agencyId) {
      return next(createError(403, 'Access denied. You can only mark payment for orders from your own agency.'));
    }

    // Only pickup orders can have payment marked as received
    if (order.deliveryMode !== 'pickup') {
      return next(createError(400, 'Payment can only be marked for pickup orders.'));
    }

    // For pickup orders, we can mark payment and automatically deliver the order
    // Order should not be cancelled or already delivered
    if (order.status === 'cancelled') {
      return next(createError(400, 'Cannot mark payment for cancelled orders.'));
    }
    
    if (order.status === 'returned') {
      return next(createError(400, 'Cannot mark payment for returned orders.'));
    }

    // Update payment received status and automatically deliver the order
    const updateData = {
      paymentReceived: value.paymentReceived,
      status: 'delivered',  // Automatically mark as delivered when payment is processed
      deliveredAt: new Date()  // Set delivery timestamp
    };

    // If notes are provided, add them to admin notes
    if (value.notes) {
      const currentNotes = order.adminNotes || '';
      const newNotes = currentNotes ? `${currentNotes}\n\nPayment Note: ${value.notes}` : `Payment Note: ${value.notes}`;
      updateData.adminNotes = newNotes;
    }

    // If payment is received, also update payment status
    if (value.paymentReceived === true) {
      updateData.paymentStatus = 'paid';
    }

    await order.update(updateData);

    logger.info(`Payment marked as ${value.paymentReceived ? 'received' : 'not received'} and order delivered: ${order.orderNumber} by ${req.user.name || req.user.email}`);

    // Emit socket notification
    const socketService = getSocketService();
    if (socketService) {
      socketService.emitOrderStatusUpdated({
        orderId: order.id,
        orderNumber: order.orderNumber,
        status: 'delivered',
        customerEmail: order.customerEmail,
        agencyId: order.agencyId,
        paymentReceived: value.paymentReceived,
        deliveredAt: new Date(),
        updatedBy: req.user.name || req.user.email
      });
    }

    res.status(200).json({
      success: true,
      message: `Payment marked as ${value.paymentReceived ? 'received' : 'not received'} and order delivered successfully`,
      data: {
        order: formatOrderResponse(order),
        paymentInfo: {
          paymentReceived: value.paymentReceived,
          paymentStatus: order.paymentStatus,
          orderStatus: 'delivered',
          deliveredAt: new Date(),
          updatedBy: req.user.name || req.user.email,
          updatedAt: new Date(),
          notes: value.notes || null
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createOrderHandler,
  getAllOrders,
  getOrderById,
  updateOrderStatusHandler,
  assignAgentHandler,
  sendOTPHandler,
  verifyOTPHandler,
  cancelOrderHandler,
  returnOrderHandler,
  markPaymentReceivedHandler,
  getOrdersByStatus,
  getCustomerOrdersSummary,
  getAgentDeliveryHistory,
  getAgentDeliveryStats
};
