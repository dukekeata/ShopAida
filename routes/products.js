const express = require('express');
const Product = require('../models/Product');
const { adminMiddleware } = require('../middleware/adminMiddleware');
const { sanitizationMiddleware, sanitizeQuery } = require('../utils/sanitizer');
const {
  validateProductCreate,
  validateProductUpdate,
  validateProductQuery
} = require('../middleware/validateRequest');

const router = express.Router();

router.use(sanitizationMiddleware);

router.get('/', validateProductQuery, async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 10);
    const skip = (page - 1) * limit;

    const filters = { isActive: true };

    if (req.query.category) {
      filters.category = sanitizeQuery(req.query.category);
    }

    if (req.query.tags) {
      filters.tags = { $in: req.query.tags.split(',').map(tag => tag.trim()) };
    }

    if (req.query.search) {
      filters.$text = { $search: sanitizeQuery(req.query.search) };
    }

    const products = await Product.find(filters)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Product.countDocuments(filters);

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

router.get('/categories', async (req, res, next) => {
  try {
    const categories = await Product.distinct('category', { isActive: true });
    res.json({ categories });
  } catch (err) {
    next(err);
  }
});

router.get('/tags', async (req, res, next) => {
  try {
    const tags = await Product.distinct('tags', { isActive: true });
    res.json({ tags });
  } catch (err) {
    next(err);
  }
});

router.get('/:productId', async (req, res, next) => {
  try {
    const productId = sanitizeQuery(req.params.productId);
    const product = await Product.findById(productId);

    if (!product || !product.isActive) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(product);
  } catch (err) {
    next(err);
  }
});

router.post('/', adminMiddleware, validateProductCreate, async (req, res, next) => {
  try {
    const product = new Product({
      name: req.body.name,
      description: req.body.description || '',
      price: req.body.price,
      currency: req.body.currency || 'USD',
      category: req.body.category || 'General',
      tags: req.body.tags || [],
      images: req.body.images || [],
      stock: req.body.stock || 0,
      metadata: req.body.metadata || {}
    });

    await product.save();
    res.status(201).json(product);
  } catch (err) {
    next(err);
  }
});

router.put('/:productId', adminMiddleware, validateProductUpdate, async (req, res, next) => {
  try {
    const productId = sanitizeQuery(req.params.productId);
    const updates = {
      name: req.body.name,
      description: req.body.description,
      price: req.body.price,
      currency: req.body.currency,
      category: req.body.category,
      tags: req.body.tags,
      images: req.body.images,
      stock: req.body.stock,
      isActive: req.body.isActive,
      metadata: req.body.metadata
    };

    const product = await Product.findByIdAndUpdate(productId, updates, {
      new: true,
      runValidators: true,
      omitUndefined: true
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(product);
  } catch (err) {
    next(err);
  }
});

router.delete('/:productId', adminMiddleware, async (req, res, next) => {
  try {
    const productId = sanitizeQuery(req.params.productId);
    const product = await Product.findByIdAndDelete(productId);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ message: 'Product deleted successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
