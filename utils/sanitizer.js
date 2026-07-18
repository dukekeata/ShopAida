// utils/sanitizer.js - Input sanitization utilities
const xss = require('xss');

// Configure XSS to be strict
const xssOptions = {
  whiteList: {}, // No HTML tags allowed
  stripIgnoredTag: true,
  stripLeadingAndTrailingWhitespace: true
};

/**
 * Sanitize a string to prevent XSS attacks
 * @param {string} str - String to sanitize
 * @returns {string} Sanitized string
 */
function sanitizeString(str) {
  if (typeof str !== 'string') {
    return str;
  }
  
  // Remove any HTML/script tags
  let sanitized = xss(str, xssOptions);
  
  // Trim whitespace
  sanitized = sanitized.trim();
  
  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');
  
  return sanitized;
}

/**
 * Sanitize an object recursively
 * @param {object} obj - Object to sanitize
 * @returns {object} Sanitized object
 */
function sanitizeObject(obj) {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  if (typeof obj === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  }
  
  return obj;
}

/**
 * Middleware to sanitize request body, query, and params
 */
function sanitizationMiddleware(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query);
  }
  
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeObject(req.params);
  }
  
  next();
}

/**
 * Sanitize email addresses (prevent common injection patterns)
 * @param {string} email - Email to sanitize
 * @returns {string} Sanitized email
 */
function sanitizeEmail(email) {
  if (typeof email !== 'string') {
    return email;
  }
  
  // Convert to lowercase
  let sanitized = email.toLowerCase().trim();
  
  // Remove whitespace
  sanitized = sanitized.replace(/\s/g, '');
  
  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');
  
  return sanitized;
}

/**
 * Sanitize numeric values (prevent type coercion attacks)
 * @param {number} value - Value to sanitize
 * @returns {number} Sanitized value
 */
function sanitizeNumber(value) {
  const num = parseFloat(value);
  
  if (isNaN(num) || !isFinite(num)) {
    throw new Error('Invalid number');
  }
  
  return num;
}

/**
 * Sanitize database query to prevent NoSQL injection
 * @param {string} str - Query string
 * @returns {string} Sanitized string
 */
function sanitizeQuery(str) {
  if (typeof str !== 'string') {
    return str;
  }
  
  // Remove MongoDB operators and dangerous characters
  let sanitized = str.replace(/[${}]/g, '');
  
  // Trim and limit length
  sanitized = sanitized.trim().substring(0, 255);
  
  return sanitized;
}

module.exports = {
  sanitizeString,
  sanitizeObject,
  sanitizationMiddleware,
  sanitizeEmail,
  sanitizeNumber,
  sanitizeQuery
};
