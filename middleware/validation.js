// middleware/validation.js - Request validation middleware using express-validator
const { body, query, param, validationResult } = require('express-validator');

// ============ VALIDATION ERROR HANDLER ============
// Run this after all validation middleware to catch and format errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map(err => ({
        field: err.param,
        message: err.msg,
        value: err.value
      }))
    });
  }
  next();
};

// ============ AUTH VALIDATION ============
const validateRegister = [
  body('email')
    .isEmail()
    .withMessage('Must be a valid email address')
    .normalizeEmail()
    .trim(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
    .withMessage('Password must contain uppercase, lowercase, number, and special character'),
  body('firstName')
    .optional()
    .isLength({ min: 2 })
    .withMessage('First name must be at least 2 characters')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('First name contains invalid characters')
    .trim(),
  body('lastName')
    .optional()
    .isLength({ min: 2 })
    .withMessage('Last name must be at least 2 characters')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('Last name contains invalid characters')
    .trim(),
  handleValidationErrors
];

const validateLogin = [
  body('email')
    .isEmail()
    .withMessage('Must be a valid email address')
    .normalizeEmail()
    .trim(),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors
];

const validateForgotPassword = [
  body('email')
    .isEmail()
    .withMessage('Must be a valid email address')
    .normalizeEmail()
    .trim(),
  handleValidationErrors
];

const validateResetPassword = [
  body('token')
    .notEmpty()
    .withMessage('Reset token is required')
    .trim(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
    .withMessage('Password must contain uppercase, lowercase, number, and special character'),
  handleValidationErrors
];

// ============ PAYMENT VALIDATION ============
const validatePayPalCreateOrder = [
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be greater than 0'),
  body('currency')
    .optional()
    .isIn(['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD'])
    .withMessage('Invalid currency code'),
  body('items')
    .optional()
    .isArray()
    .withMessage('Items must be an array'),
  handleValidationErrors
];

const validatePayPalCaptureOrder = [
  body('orderID')
    .notEmpty()
    .withMessage('Order ID is required')
    .trim()
    .matches(/^[a-zA-Z0-9-]+$/)
    .withMessage('Invalid order ID format'),
  body('amount')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be greater than 0'),
  body('items')
    .optional()
    .isArray()
    .withMessage('Items must be an array'),
  handleValidationErrors
];

const validatePaystackInitialize = [
  body('email')
    .optional()
    .isEmail()
    .withMessage('Must be a valid email address')
    .normalizeEmail()
    .trim(),
  body('amount')
    .isInt({ min: 100 })
    .withMessage('Amount must be at least 100 kobo (₦1.00)'),
  body('items')
    .optional()
    .isArray()
    .withMessage('Items must be an array'),
  handleValidationErrors
];

const validatePaystackVerify = [
  param('reference')
    .notEmpty()
    .withMessage('Payment reference is required')
    .trim()
    .matches(/^[a-zA-Z0-9-]+$/)
    .withMessage('Invalid reference format'),
  handleValidationErrors
];

// ============ PRODUCT & CART VALIDATION ============
const validateAddToCart = [
  body('productId')
    .notEmpty()
    .withMessage('Product ID is required')
    .matches(/^[0-9]+$/)
    .withMessage('Invalid product ID'),
  body('quantity')
    .isInt({ min: 1, max: 100 })
    .withMessage('Quantity must be between 1 and 100'),
  body('price')
    .isFloat({ min: 0 })
    .withMessage('Price must be a valid number'),
  handleValidationErrors
];

const validateUpdateCart = [
  body('items')
    .isArray({ min: 1 })
    .withMessage('Items must be a non-empty array'),
  body('items.*.productId')
    .matches(/^[0-9]+$/)
    .withMessage('Invalid product ID in items'),
  body('items.*.quantity')
    .isInt({ min: 1, max: 100 })
    .withMessage('Quantity must be between 1 and 100'),
  handleValidationErrors
];

const validateCheckout = [
  body('items')
    .isArray({ min: 1 })
    .withMessage('Items must be a non-empty array'),
  body('items.*.productId')
    .matches(/^[0-9]+$/)
    .withMessage('Invalid product ID'),
  body('items.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be at least 1'),
  body('shippingAddress.fullName')
    .notEmpty()
    .withMessage('Full name is required')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('Full name contains invalid characters'),
  body('shippingAddress.phone')
    .matches(/^[\d\s+()-]{10,20}$/)
    .withMessage('Invalid phone number format'),
  body('shippingAddress.address')
    .notEmpty()
    .withMessage('Address is required')
    .isLength({ min: 5 })
    .withMessage('Address must be at least 5 characters'),
  body('shippingAddress.city')
    .notEmpty()
    .withMessage('City is required')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('City contains invalid characters'),
  body('shippingAddress.state')
    .notEmpty()
    .withMessage('State is required'),
  body('shippingAddress.zipCode')
    .matches(/^[a-zA-Z0-9\s-]{3,20}$/)
    .withMessage('Invalid ZIP/postal code format'),
  handleValidationErrors
];

// ============ ORDER VALIDATION ============
const validateCreateOrder = [
  body('items')
    .isArray({ min: 1 })
    .withMessage('Order must contain at least one item'),
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be greater than 0'),
  body('paymentMethod')
    .isIn(['paypal', 'paystack', 'card'])
    .withMessage('Invalid payment method'),
  handleValidationErrors
];

const validateUpdateOrder = [
  body('status')
    .optional()
    .isIn(['pending', 'processing', 'shipped', 'delivered', 'cancelled'])
    .withMessage('Invalid order status'),
  body('trackingNumber')
    .optional()
    .trim()
    .isLength({ min: 5 })
    .withMessage('Tracking number must be at least 5 characters'),
  handleValidationErrors
];

// ============ QUERY PARAMETER VALIDATION ============
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  handleValidationErrors
];

const validateSearch = [
  query('q')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be between 1 and 100 characters')
    .matches(/^[a-zA-Z0-9\s-&()]+$/)
    .withMessage('Search query contains invalid characters'),
  handleValidationErrors
];

// ============ PARAM VALIDATION ============
const validateId = [
  param('id')
    .matches(/^[0-9]+$/)
    .withMessage('Invalid ID format'),
  handleValidationErrors
];

const validateMongoId = [
  param('id')
    .matches(/^[a-f0-9]{24}$/)
    .withMessage('Invalid MongoDB ID format'),
  handleValidationErrors
];

const validateOrderId = [
  param('orderId')
    .matches(/^[a-f0-9]{24}$/)
    .withMessage('Invalid MongoDB ID format'),
  handleValidationErrors
];

module.exports = {
  // Auth
  validateRegister,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
  
  // Payments
  validatePayPalCreateOrder,
  validatePayPalCaptureOrder,
  validatePaystackInitialize,
  validatePaystackVerify,
  
  // Products & Cart
  validateAddToCart,
  validateUpdateCart,
  validateCheckout,
  
  // Orders
  validateCreateOrder,
  validateUpdateOrder,
  
  // Query & Param
  validatePagination,
  validateSearch,
  validateId,
  validateMongoId,
  validateOrderId,
  
  // Error handler
  handleValidationErrors
};
