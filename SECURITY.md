# Phase 3: Input Validation & Security Hardening - Implementation Guide

## Overview
This document outlines the security enhancements implemented in Phase 3 of the ShopAida e-commerce platform. These changes introduce comprehensive input validation, rate limiting, and XSS prevention.

## What Was Implemented

### 1. **Input Validation Middleware** (`middleware/validation.js`)
Comprehensive validation for all user inputs using `express-validator`:

#### Auth Endpoints
- **Register**: Email format, password strength (8+ chars, uppercase, lowercase, numbers, special chars), name format
- **Login**: Email format, password validation
- **Forgot Password**: Email validation
- **Reset Password**: Token and new password validation

#### Payment Endpoints
- **PayPal Create Order**: Amount validation (positive), currency code validation
- **PayPal Capture Order**: OrderID format validation, amount validation
- **Paystack Initialize**: Email format, amount validation (minimum ₦1.00 = 100 kobo)
- **Paystack Verify**: Payment reference format validation

#### Product & Cart Endpoints
- **Add to Cart**: Product ID, quantity (1-100), price validation
- **Update Cart**: Multiple item validation
- **Checkout**: Full shipping address validation including phone, address, city, state, ZIP code

#### Order Endpoints
- **Create Order**: Items array, amount, payment method validation
- **Update Order**: Status validation, tracking number validation

### 2. **Input Sanitization** (`utils/sanitizer.js`)
Prevents XSS attacks and injection vulnerabilities:

- **XSS Prevention**: Strips all HTML/script tags from strings
- **Null Byte Removal**: Prevents null byte injection attacks
- **Email Sanitization**: Lowercase conversion and whitespace removal
- **Numeric Sanitization**: Prevents type coercion attacks
- **NoSQL Injection Prevention**: Removes MongoDB operators ($, {, })
- **Recursive Sanitization**: Sanitizes objects, arrays, and nested structures
- **Middleware Integration**: Automatically sanitizes req.body, req.query, and req.params

### 3. **Enhanced Security Headers** (server.js)
Implemented comprehensive security headers via Helmet and custom middleware:

#### CSP (Content Security Policy)
- Restricts script execution to same-origin only
- Prevents unauthorized style loading
- No object, media, or frame embedding
- Strict image source policies

#### HSTS (HTTP Strict Transport Security)
- Enforces HTTPS for 1 year
- Includes subdomains
- Preload enabled for Chrome HSTS preload list

#### Additional Headers
- `X-Content-Type-Options: nosniff` - Prevents MIME sniffing
- `X-Frame-Options: DENY` - Prevents clickjacking
- `X-XSS-Protection: 1; mode=block` - Legacy XSS protection
- `Permissions-Policy` - Disables geolocation, microphone, camera

### 4. **Enhanced Rate Limiting**
Three-tier rate limiting strategy:

**Global Rate Limiting**
- 100 requests per 15 minutes per IP
- Applies to all endpoints (except health check)
- Prevents general abuse

**Authentication Rate Limiting** (stricter)
- 5 failed attempts per 15 minutes per IP
- Only counts failed requests
- Prevents brute force attacks

**Payment Rate Limiting** (strictest)
- 3 requests per 1 minute per IP
- Prevents payment abuse and fraud

### 5. **Route Security Updates**

#### Auth Routes (`routes/auth.js`)
- Input validation for register/login
- Email sanitization
- Password strength requirements
- Removed duplicate validation logic (now in validation middleware)

#### Payment Routes (`routes/payments.js`)
- Order ID sanitization
- Amount sanitization
- Input validation for all payment operations
- Prevents injection attacks in PayPal/Paystack API calls

#### Order Routes (`routes/orders.js`)
- MongoDB ID validation
- Pagination limits (max 50 items)
- Order ownership verification
- Query sanitization

#### Server Configuration (`server.js`)
- Comprehensive security middleware setup
- Stricter body size limits (10KB instead of 10MB)
- Sanitization applied globally
- Additional security headers

## Key Security Features

### Password Strength Requirements
```
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character (@$!%*?&)
```

### Validation Examples

#### Good Requests
```json
POST /api/auth/register
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe"
}
```

#### Bad Requests (Will Be Rejected)
```json
// Weak password
{ "password": "weak" }

// Invalid email
{ "email": "not-an-email" }

// XSS attempt
{ "firstName": "<script>alert('xss')</script>" }

// Invalid phone format
{ "shippingAddress": { "phone": "12345" } }
```

### Rate Limit Response
```json
{
  "message": "Too many requests from this IP, please try again later."
}
```

### Validation Error Response
```json
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
      "message": "Password must be at least 8 characters",
      "value": "short"
    }
  ]
}
```

## Configuration Files

### `middleware/securityConfig.js`
Centralized configuration for:
- Password requirements
- Rate limit settings
- Request size limits
- CORS options
- CSP directives
- HSTS settings

## Testing the Security

### Test Invalid Inputs
```bash
# Test weak password
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"weak"}'

# Test invalid email
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"invalid","password":"SecurePass123!"}'

# Test XSS attempt
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"SecurePass123!","firstName":"<script>alert(1)</script>"}'
```

### Test Rate Limiting
```bash
# Make 6 login attempts quickly (should fail on 6th)
for i in {1..6}; do
  curl -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}'
done
```

## Environment Variables Required
```
PORT=3000
NODE_ENV=development
JWT_SECRET=your-secret-key
PAYPAL_CLIENT_ID=your-paypal-id
PAYPAL_SECRET=your-paypal-secret
PAYSTACK_SECRET_KEY=your-paystack-key
MONGO_URI=your-database-uri
```

## Migration Notes

### For Existing Frontend Code
The validation middleware might reject some previously accepted inputs. Ensure:

1. All emails are valid format (example@domain.com)
2. Passwords meet strength requirements when registering
3. Phone numbers follow international format
4. Addresses are at least 5 characters
5. Numeric values are valid numbers (not strings representing numbers)

### Breaking Changes
- Request body size limit reduced from 10MB to 10KB
- Stricter password requirements on registration
- All HTML tags are stripped from input

## Best Practices Going Forward

1. **Always validate on frontend** - Better UX, reduces server load
2. **Test with invalid inputs** - Ensure proper error messages
3. **Keep passwords strong** - Use the provided requirements
4. **Monitor rate limits** - Adjust if legitimate users hit limits
5. **Never bypass validation** - Security features are not optional
6. **Update regularly** - Keep validation rules current

## Files Modified/Created

### New Files
- `middleware/validation.js` - Comprehensive validation middleware
- `utils/sanitizer.js` - Input sanitization utilities
- `middleware/securityConfig.js` - Centralized security config
- `SECURITY.md` (this file)

### Updated Files
- `server.js` - Enhanced security headers and rate limiting
- `routes/auth.js` - Added validation and sanitization
- `routes/payments.js` - Added validation and sanitization
- `routes/orders.js` - Added validation and sanitization
- `package.json` - Added express-validator and xss packages

## Performance Impact
- Validation adds ~1-5ms per request (negligible)
- Rate limiting uses in-memory store (can be moved to Redis for distributed systems)
- Sanitization adds ~2-10ms per request depending on payload size

## Future Enhancements
1. Database query rate limiting per user (not just IP)
2. Redis-based rate limiting for load-balanced environments
3. Request signing for critical operations
4. Two-factor authentication
5. API key management system
6. Audit logging for all sensitive operations
7. CAPTCHA integration for auth endpoints
