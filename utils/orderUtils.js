const crypto = require('crypto');

// Generate unique order number
const generateOrderNumber = () => {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `ORD-${timestamp.slice(-6)}-${random}`;
};

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Calculate order totals
const calculateOrderTotals = (items) => {
  let subtotal = 0;
  
  items.forEach(item => {
    const itemTotal = parseFloat(item.variantPrice) * parseInt(item.quantity);
    subtotal += itemTotal;
  });
  
  return {
    subtotal: parseFloat(subtotal.toFixed(2)),
    totalAmount: parseFloat(subtotal.toFixed(2)) // No tax/shipping for now
  };
};

// Validate OTP
const validateOTP = (inputOTP, storedOTP, expiresAt) => {
  if (!storedOTP || !expiresAt) {
    return false;
  }
  
  if (new Date() > new Date(expiresAt)) {
    return false; // OTP expired
  }
  
  return inputOTP === storedOTP;
};

// Format order for response
const formatOrderResponse = (order, includeAgent = false) => {
  const formatted = {
    id: order.id,
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    customerPhone: order.customerPhone,
    customerAddress: order.customerAddress,
    items: order.items,
    subtotal: order.subtotal,
    totalAmount: order.totalAmount,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    status: order.status,
    adminNotes: order.adminNotes,
    agentNotes: order.agentNotes,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    confirmedAt: order.confirmedAt,
    assignedAt: order.assignedAt,
    outForDeliveryAt: order.outForDeliveryAt,
    deliveredAt: order.deliveredAt,
    cancelledAt: order.cancelledAt
  };

  if (includeAgent && order.assignedAgentId) {
    formatted.assignedAgent = {
      id: order.DeliveryAgent?.id,
      name: order.DeliveryAgent?.name,
      phone: order.DeliveryAgent?.phone,
      vehicleNumber: order.DeliveryAgent?.vehicleNumber
    };
  }

  return formatted;
};

// Socket notification types
const NOTIFICATION_TYPES = {
  ORDER_CREATED: 'order_created',
  ORDER_CONFIRMED: 'order_confirmed',
  ORDER_ASSIGNED: 'order_assigned',
  ORDER_OUT_FOR_DELIVERY: 'order_out_for_delivery',
  ORDER_DELIVERED: 'order_delivered',
  ORDER_CANCELLED: 'order_cancelled',
  OTP_SENT: 'otp_sent',
  OTP_VERIFIED: 'otp_verified'
};

// Create socket notification payload
const createNotificationPayload = (type, data) => {
  return {
    type,
    timestamp: new Date().toISOString(),
    data
  };
};

module.exports = {
  generateOrderNumber,
  generateOTP,
  calculateOrderTotals,
  validateOTP,
  formatOrderResponse,
  NOTIFICATION_TYPES,
  createNotificationPayload
};

