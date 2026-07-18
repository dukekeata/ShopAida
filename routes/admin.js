const express = require('express');
const mongoose = require('mongoose');
const Product = require('../models/Product');
const Order = require('../models/Order');
const User = require('../models/User');
const LoginAttempt = require('../models/LoginAttempt');
const memoryStore = require('../utils/memoryStore');
const { adminMiddleware } = require('../middleware/adminMiddleware');
const { sanitizationMiddleware } = require('../utils/sanitizer');
const { validatePagination } = require('../middleware/validateRequest');

const router = express.Router();
router.use(sanitizationMiddleware);

router.get('/', adminMiddleware, (req, res) => {
  res.json({
    message: 'Admin API available',
    routes: [
      '/api/admin/overview',
      '/api/admin/orders',
      '/api/admin/products',
      '/api/admin/activity'
    ]
  });
});

router.get('/overview', adminMiddleware, async (req, res, next) => {
  try {
    const useMemoryStore = memoryStore.isEnabled() && mongoose.connection.readyState !== 1;
    let totalProducts = 0;
    let totalOrders = 0;
    let totalUsers = 0;
    let recentOrders = [];
    let totalRevenue = 0;
    let avgOrderValue = 0;
    let recentLoginAttempts = [];
    let failedLoginAttempts = 0;

    if (useMemoryStore) {
      totalProducts = memoryStore.products.size;
      totalOrders = memoryStore.orders.size;
      totalUsers = memoryStore.users.size;
      recentOrders = Array.from(memoryStore.orders.values())
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 10);
      totalRevenue = Array.from(memoryStore.orders.values()).reduce((sum, order) => sum + (order.totalAmount || 0), 0);
      avgOrderValue = totalOrders ? totalRevenue / totalOrders : 0;
      recentLoginAttempts = await memoryStore.findLoginAttempts({ limit: 10 });
      failedLoginAttempts = await memoryStore.countLoginAttempts(attempt => !attempt.success && attempt.timestamp >= new Date(Date.now() - 24 * 60 * 60 * 1000));
    } else {
      totalProducts = await Product.countDocuments();
      totalOrders = await Order.countDocuments();
      totalUsers = await User.countDocuments();
      recentOrders = await Order.find()
        .sort({ createdAt: -1 })
        .limit(10);

      const revenueResult = await Order.aggregate([
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$totalAmount' },
            avgOrderValue: { $avg: '$totalAmount' }
          }
        }
      ]);

      recentLoginAttempts = await LoginAttempt.find()
        .sort({ timestamp: -1 })
        .limit(10);

      failedLoginAttempts = await LoginAttempt.countDocuments({
        success: false,
        timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      });

      totalRevenue = revenueResult[0]?.totalRevenue || 0;
      avgOrderValue = revenueResult[0]?.avgOrderValue || 0;
    }

    res.json({
      totalProducts,
      totalOrders,
      totalUsers,
      totalRevenue,
      avgOrderValue,
      failedLoginAttempts,
      recentOrders,
      recentLoginAttempts
    });
  } catch (err) {
    next(err);
  }
});

router.get('/activity', adminMiddleware, validatePagination, async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 10);
    const skip = (page - 1) * limit;
    const useMemoryStore = memoryStore.isEnabled() && mongoose.connection.readyState !== 1;

    let attempts = [];
    let total = 0;

    if (useMemoryStore) {
      attempts = await memoryStore.findLoginAttempts({ limit, skip });
      total = await memoryStore.countLoginAttempts();
    } else {
      attempts = await LoginAttempt.find()
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit);
      total = await LoginAttempt.countDocuments();
    }

    res.json({
      attempts,
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

router.get('/orders', adminMiddleware, validatePagination, async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 10);
    const skip = (page - 1) * limit;

    const orders = await Order.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Order.countDocuments();

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

router.get('/products', adminMiddleware, validatePagination, async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 10);
    const skip = (page - 1) * limit;

    const products = await Product.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Product.countDocuments();

    res.json({
      products,
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

module.exports = router;
