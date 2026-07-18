const { body, param, query, validationResult } = require('express-validator');

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

const validatePayPalCreateOrder = [
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be greater than 0'),
  body('currency')
    .optional()
    .matches(/^[A-Z]{3}$/)
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
    .trim(),
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
    .trim(),
  handleValidationErrors
];

const validateProductCreate = [
  body('name')
    .notEmpty()
    .withMessage('Product name is required')
    .trim(),
  body('price')
    .isFloat({ min: 0 })
    .withMessage('Price must be a non-negative number'),
  body('currency')
    .optional()
    .matches(/^[A-Z]{3}$/)
    .withMessage('Invalid currency code'),
  body('category')
    .optional()
    .trim(),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('tags.*')
    .optional()
    .isString()
    .trim(),
  body('stock')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Stock must be a non-negative integer'),
  handleValidationErrors
];

const validateProductUpdate = [
  body('name')
    .optional()
    .notEmpty()
    .withMessage('Product name may not be empty')
    .trim(),
  body('price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price must be a non-negative number'),
  body('currency')
    .optional()
    .matches(/^[A-Z]{3}$/)
    .withMessage('Invalid currency code'),
  body('category')
    .optional()
    .trim(),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('tags.*')
    .optional()
    .isString()
    .trim(),
  body('stock')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Stock must be a non-negative integer'),
  handleValidationErrors
];

const validateProductQuery = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('category')
    .optional()
    .trim(),
  query('tags')
    .optional()
    .trim(),
  query('search')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search must be between 1 and 100 characters'),
  handleValidationErrors
];

const validateOrderCreate = [
  body('items')
    .isArray({ min: 1 })
    .withMessage('Order must contain at least one item'),
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be greater than 0'),
  body('paymentMethod')
    .isIn(['paypal', 'paystack', 'stripe', 'card'])
    .withMessage('Invalid payment method'),
  body('shippingAddress.firstName')
    .notEmpty()
    .withMessage('First name is required')
    .trim(),
  body('shippingAddress.lastName')
    .optional()
    .isLength({ min: 2 })
    .withMessage('Last name must be at least 2 characters')
    .trim(),
  body('shippingAddress.phone')
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(/^[\d\s+()-]{10,20}$/)
    .withMessage('Invalid phone number format')
    .trim(),
  body('shippingAddress.street')
    .notEmpty()
    .withMessage('Street address is required')
    .isLength({ min: 5 })
    .withMessage('Street address must be at least 5 characters')
    .trim(),
  body('shippingAddress.city')
    .notEmpty()
    .withMessage('City is required')
    .trim(),
  body('shippingAddress.state')
    .notEmpty()
    .withMessage('State is required')
    .trim(),
  body('shippingAddress.country')
    .notEmpty()
    .withMessage('Country is required')
    .trim(),
  body('shippingAddress.zipCode')
    .notEmpty()
    .withMessage('ZIP/postal code is required')
    .trim(),
  handleValidationErrors
];

const validateOrderId = [
  param('orderId')
    .notEmpty()
    .withMessage('Order ID is required')
    .trim(),
  handleValidationErrors
];

const validateOrderStatusUpdate = [
  body('status')
    .isIn(['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'])
    .withMessage('Invalid order status'),
  handleValidationErrors
];

const validateStripeCreatePaymentIntent = [
  body('amount')
    .isFloat({ min: 0.5 })
    .withMessage('Amount must be at least 0.50'),
  body('currency')
    .optional()
    .matches(/^[A-Z]{3}$/)
    .withMessage('Invalid currency code'),
  body('items')
    .optional()
    .isArray()
    .withMessage('Items must be an array'),
  handleValidationErrors
];

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

module.exports = {
  validateRegister,
  validateLogin,
  validatePayPalCreateOrder,
  validatePayPalCaptureOrder,
  validatePaystackInitialize,
  validatePaystackVerify,
  validateProductCreate,
  validateProductUpdate,
  validateProductQuery,
  validateOrderCreate,
  validateOrderId,
  validateOrderStatusUpdate,
  validateStripeCreatePaymentIntent,
  validatePagination,
  handleValidationErrors
};
