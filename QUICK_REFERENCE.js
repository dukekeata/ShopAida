/* PHASE 3 QUICK REFERENCE GUIDE - Documentation Only
   This file contains documentation and examples, not executable code.
   Wrapped in comments to prevent syntax errors.

// PHASE 3 QUICK REFERENCE GUIDE
// Input Validation & Security Hardening

/**
 * ============================================
 * VALIDATION RULES QUICK REFERENCE
 * ============================================
 */

// EMAIL
// Pattern: user@example.com
// Rules: Valid email format required
// Automatically normalized to lowercase

// PASSWORD
// Pattern: SecurePass123!
// Length: Minimum 8 characters
// Must include: UPPERCASE + lowercase + number + special char (@$!%*?&)
// ✗ Bad: "password123" (no uppercase, no special char)
// ✓ Good: "SecurePass123!"

// PHONE
// Pattern: +1 (555) 123-4567 or 555-123-4567
// Length: 10-20 characters
// ✗ Bad: "123" (too short)
// ✓ Good: "+1 (555) 123-4567"

// AMOUNT (Payment)
// Type: Positive float
// Minimum: 0.01
// ✗ Bad: -10, 0
// ✓ Good: 99.99, 0.01

// QUANTITY
// Type: Integer 1-100
// ✗ Bad: 0, 150, -5
// ✓ Good: 1-100

// ADDRESS
// Length: Minimum 5 characters
// ✗ Bad: "123"
// ✓ Good: "123 Main Street, Apt 4B"

// ZIP/POSTAL CODE
// Pattern: 3-20 alphanumeric characters with dashes allowed
// ✗ Bad: "1"
// ✓ Good: "12345", "SW1A 1AA", "M5V 3A8"

/**
 * ============================================
 * SECURITY FEATURES
 * ============================================
 */

// 1. XSS PREVENTION
//    - Input: "<script>alert('xss')</script>"
//    - Stored: "scriptalertxssscript" (tags removed)

// 2. RATE LIMITING
//    - Global: 100 requests / 15 minutes
//    - Auth: 5 failed attempts / 15 minutes
//    - Payment: 3 requests / 1 minute

// 3. SECURITY HEADERS
//    - CSP: Blocks inline scripts
//    - HSTS: Forces HTTPS
//    - X-Frame-Options: Prevents clickjacking

// 4. NoSQL INJECTION PREVENTION
//    - Input: { $where: "1==1" }
//    - Stored: "where: 1==1" ($symbols removed)

// 5. REQUEST SIZE LIMITS
//    - Maximum: 10KB per request
//    - Prevents memory exhaustion

/**
 * ============================================
 * API ENDPOINT VALIDATION MATRIX
 * ============================================
 */

// AUTH ENDPOINTS
// POST /api/auth/register
// ├─ email (string, required) - Valid email
// ├─ password (string, required) - Strong password
// ├─ firstName (string, optional) - 2+ chars, letters only
// └─ lastName (string, optional) - 2+ chars, letters only

// POST /api/auth/login
// ├─ email (string, required) - Valid email
// └─ password (string, required) - Required

// PAYMENT ENDPOINTS
// POST /api/payments/paypal/create-order
// ├─ amount (number, required) - > 0
// ├─ currency (string, optional) - USD|EUR|GBP|JPY|AUD|CAD
// └─ items (array, optional) - Array of items

// POST /api/payments/paystack/initialize
// ├─ email (string, required) - Valid email
// ├─ amount (number, required) - >= 100 (kobo)
// └─ metadata (object, optional) - Custom metadata

// CART ENDPOINTS
// POST /api/cart/add
// ├─ productId (string, required) - Numeric string
// ├─ quantity (number, required) - 1-100
// └─ price (number, required) - Valid number

// ORDER ENDPOINTS
// GET /api/orders
// ├─ page (number, optional) - Positive integer
// └─ limit (number, optional) - 1-50

// GET /api/orders/:orderId
// └─ orderId (string, required) - Valid MongoDB ID (24 hex chars)

/**
 * ============================================
 * ERROR RESPONSE EXAMPLES
 * ============================================
 */

// Validation Error
/*
{
  "error": "Validation failed",
  "details": [
    {
      "field": "email",
      "message": "Must be a valid email address",
      "value": "invalid-email"
    },
    {
      "field": "password",
      "message": "Password must contain uppercase, lowercase, number, and special character",
      "value": "weak"
    }
  ]
}
*/

// Rate Limit Error
/*
{
  "message": "Too many requests from this IP, please try again later."
}
*/

// Authorization Error
/*
{
  "error": "Unauthorized"
}
*/

/**
 * ============================================
 * COMMON VALIDATION ERRORS & FIXES
 * ============================================
 */

// ERROR: "Must be a valid email address"
// CAUSE: Email format invalid
// FIX: Use format: user@example.com

// ERROR: "Password must be at least 8 characters"
// CAUSE: Password too short
// FIX: Use 8+ characters

// ERROR: "Password must contain uppercase, lowercase, number, and special character"
// CAUSE: Missing required character types
// FIX: Use: Uppercase + lowercase + number + special char (@$!%*?&)
// EXAMPLE: SecurePass123!

// ERROR: "Quantity must be between 1 and 100"
// CAUSE: Quantity out of range
// FIX: Use quantity between 1-100

// ERROR: "Invalid phone number format"
// CAUSE: Phone format incorrect
// FIX: Use format: +1 (555) 123-4567 (10-20 chars)

// ERROR: "Amount must be greater than 0"
// CAUSE: Amount is zero or negative
// FIX: Use positive number (> 0)

// ERROR: "Too many requests from this IP"
// CAUSE: Rate limit exceeded
// FIX: Wait before retrying
// LIMITS:
// - General: 100/15 minutes
// - Login: 5 failures/15 minutes
// - Payments: 3/1 minute

/**
 * ============================================
 * TESTING VALIDATION
 * ============================================
 */

// Test weak password
// curl -X POST http://localhost:3000/api/auth/register \
//   -H "Content-Type: application/json" \
//   -d '{
//     "email":"test@test.com",
//     "password":"weak"
//   }'

// Test invalid email
// curl -X POST http://localhost:3000/api/auth/register \
//   -H "Content-Type: application/json" \
//   -d '{
//     "email":"not-an-email",
//     "password":"SecurePass123!"
//   }'

// Test XSS prevention
// curl -X POST http://localhost:3000/api/auth/register \
//   -H "Content-Type: application/json" \
//   -d '{
//     "email":"test@test.com",
//     "password":"SecurePass123!",
//     "firstName":"<script>alert(1)</script>"
//   }'

// Valid registration
// curl -X POST http://localhost:3000/api/auth/register \
//   -H "Content-Type: application/json" \
//   -d '{
//     "email":"newuser@example.com",
//     "password":"SecurePass123!",
//     "firstName":"John",
//     "lastName":"Doe"
//   }'

/**
 * ============================================
 * CONFIGURATION REFERENCE
 * ============================================
 */

// Location: middleware/securityConfig.js
// Edit these values to customize:

// Password Requirements
// passwordRequirements: {
//   minLength: 8,
//   pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/
// }

// Rate Limits
// rateLimits: {
//   global: { windowMs: 15 * 60 * 1000, max: 100 },
//   auth: { windowMs: 15 * 60 * 1000, max: 5 },
//   payment: { windowMs: 60 * 1000, max: 3 }
// }

// Request Size
// requestLimits: {
//   json: '10kb',
//   urlencoded: '10kb'
// }

/**
 * ============================================
 * FILES REFERENCE
 * ============================================
 */

// NEW FILES
// middleware/validation.js - All validation rules
// utils/sanitizer.js - Input sanitization
// middleware/securityConfig.js - Security configuration
// SECURITY.md - Detailed security documentation
// PHASE3_SUMMARY.md - Implementation summary

// MODIFIED FILES
// server.js - Security headers, rate limiting, sanitization
// routes/auth.js - Validation middleware applied
// routes/payments.js - Validation middleware applied
// routes/orders.js - Validation middleware applied
// package.json - New dependencies added

// End of documentation
