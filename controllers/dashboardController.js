const { Op, fn, col, literal, Sequelize } = require('sequelize');
const { User, DeliveryAgent, Agency, Product, Order } = require('../models');
const { createError } = require('../utils/errorHandler');

// Admin-only dashboard summary
const getDashboard = async (req, res, next) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return next(createError(403, 'Admins only'));
    }

    // Totals
    const [totalUsers, totalAgents, totalAgencies, totalProducts, totalOrders] = await Promise.all([
      User.count(),
      DeliveryAgent.count(),
      Agency.count(),
      Product.count(),
      Order.count()
    ]);

    // Users breakdown
    const [activeUsers, blockedUsers, registeredUsers] = await Promise.all([
      User.count({ where: { isBlocked: false } }),
      User.count({ where: { isBlocked: true } }),
      User.count({ where: { registeredAt: { [Op.ne]: null } } })
    ]);

    // Agencies breakdown
    const [activeAgencies, inactiveAgencies] = await Promise.all([
      Agency.count({ where: { status: 'active' } }),
      Agency.count({ where: { status: 'inactive' } })
    ]);

    // Products breakdown
    const [activeProducts, inactiveProducts] = await Promise.all([
      Product.count({ where: { status: 'active' } }),
      Product.count({ where: { status: 'inactive' } })
    ]);

    // Orders by status
    const orderStatuses = ['pending', 'confirmed', 'assigned', 'out_for_delivery', 'delivered', 'cancelled'];
    const ordersByStatusRows = await Order.findAll({
      attributes: ['status', [fn('COUNT', col('Order.id')), 'count']],
      group: ['status']
    });
    const ordersByStatus = Object.fromEntries(orderStatuses.map(s => [s, 0]));
    for (const row of ordersByStatusRows) {
      ordersByStatus[row.get('status')] = parseInt(row.get('count'), 10);
    }

    // Orders per agent (counts by status)
    const ordersPerAgent = await Order.findAll({
      attributes: [
        'assignedAgentId',
        [fn('COUNT', col('Order.id')), 'totalOrders'],
        [fn('SUM', literal("CASE WHEN \"Order\".\"status\"='pending' THEN 1 ELSE 0 END")), 'pending'],
        [fn('SUM', literal("CASE WHEN \"Order\".\"status\"='confirmed' THEN 1 ELSE 0 END")), 'confirmed'],
        [fn('SUM', literal("CASE WHEN \"Order\".\"status\"='assigned' THEN 1 ELSE 0 END")), 'assigned'],
        [fn('SUM', literal("CASE WHEN \"Order\".\"status\"='out_for_delivery' THEN 1 ELSE 0 END")), 'out_for_delivery'],
        [fn('SUM', literal("CASE WHEN \"Order\".\"status\"='delivered' THEN 1 ELSE 0 END")), 'delivered'],
        [fn('SUM', literal("CASE WHEN \"Order\".\"status\"='cancelled' THEN 1 ELSE 0 END")), 'cancelled']
      ],
      include: [{ model: DeliveryAgent, as: 'DeliveryAgent', attributes: ['id', 'name', 'email', 'phone', 'status'] }],
      group: [
        'assignedAgentId',
        'DeliveryAgent.id',
        'DeliveryAgent.name',
        'DeliveryAgent.email',
        'DeliveryAgent.phone',
        'DeliveryAgent.status'
      ]
    });

    // Recent orders with assignment
    const recentOrders = await Order.findAll({
      order: [['createdAt', 'DESC']],
      limit: 20,
      include: [{ model: DeliveryAgent, as: 'DeliveryAgent', attributes: ['id', 'name', 'email', 'phone'] }]
    });

    // Build response
    return res.status(200).json({
      success: true,
      message: 'Dashboard data',
      data: {
        totals: {
          users: totalUsers,
          agents: totalAgents,
          agencies: totalAgencies,
          products: totalProducts,
          orders: totalOrders
        },
        users: {
          active: activeUsers,
          blocked: blockedUsers,
          registered: registeredUsers
        },
        agencies: {
          active: activeAgencies,
          inactive: inactiveAgencies
        },
        products: {
          active: activeProducts,
          inactive: inactiveProducts
        },
        orders: {
          byStatus: ordersByStatus,
          perAgent: ordersPerAgent
        },
        recent: {
          orders: recentOrders
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboard
};


