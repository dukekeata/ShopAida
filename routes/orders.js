const express = require('express');
const Order = require('../models/Order');
const { authMiddleware } = require('../middleware/authMiddleware');
const { adminMiddleware } = require('../middleware/adminMiddleware');
const { sanitizationMiddleware, sanitizeQuery } = require('../utils/sanitizer');
const {
  validatePagination,
  validateOrderId,
  validateOrderCreate,
  validateOrderStatusUpdate
} = require('../middleware/validateRequest');
const { sendOrderConfirmation } = require('../utils/email');
const User = require('../models/User');

const router = express.Router();

// Apply sanitization to all routes
router.use(sanitizationMiddleware);

// Get user orders
router.get('/', authMiddleware, validatePagination, async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 10);
    const skip = (page - 1) * limit;

    const orders = await Order.find({ userId: req.user.userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Order.countDocuments({ userId: req.user.userId });

    res.json({
      orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    next(err);
  }
});

// Get single order
router.get('/:orderId', authMiddleware, validateOrderId, async (req, res, next) => {
  try {
    const orderId = sanitizeQuery(req.params.orderId);
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.userId.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    res.json(order);
  } catch (err) {
    next(err);
  }
});

// Create order
router.post('/', authMiddleware, validateOrderCreate, async (req, res, next) => {
  try {
    const {
      items,
      amount,
      paymentMethod,
      currency = 'NGN',
      paymentReference,
      shippingAddress,
      metadata,
      notes
    } = req.body;

    const order = new Order({
      userId: req.user.userId,
      items,
      totalAmount: amount,
      currency,
      status: 'pending',
      paymentMethod,
      paymentReference: paymentReference || '',
      shippingAddress: {
        firstName: shippingAddress.firstName,
        lastName: shippingAddress.lastName || '',
        street: shippingAddress.street,
        city: shippingAddress.city,
        state: shippingAddress.state,
        country: shippingAddress.country,
        zipCode: shippingAddress.zipCode,
        phone: shippingAddress.phone
      },
      metadata: metadata || {},
      notes: notes || '',
      events: [{ status: 'Order Placed', message: 'Your order has been received and is being processed.' }]
    });

    await order.save();
    
    // Fetch user to get email
    const user = await User.findById(req.user.userId);
    if (user && user.email) {
      await sendOrderConfirmation(user.email, order);
    }
    
    res.status(201).json(order);
  } catch (err) {
    next(err);
  }
});

// Update order status (admin only)
router.patch('/:orderId/status', adminMiddleware, validateOrderId, validateOrderStatusUpdate, async (req, res, next) => {
  try {
    const orderId = sanitizeQuery(req.params.orderId);
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    order.status = req.body.status;
    if (['completed', 'delivered'].includes(order.status)) {
      order.completedAt = new Date();
    }
    
    order.events.push({
      status: req.body.status.charAt(0).toUpperCase() + req.body.status.slice(1),
      message: `Order status updated to ${req.body.status}`
    });

    await order.save();
    res.json(order);
  } catch (err) {
    next(err);
  }
});

// Cancel order
router.delete('/:orderId', authMiddleware, validateOrderId, async (req, res, next) => {
  try {
    const orderId = sanitizeQuery(req.params.orderId);
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.userId.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({ error: 'Only pending orders can be cancelled' });
    }

    order.status = 'cancelled';
    await order.save();

    res.json({ message: 'Order cancelled successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
