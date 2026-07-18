const { validationResult } = require('express-validator');
const {
  validateRegister,
  validateLogin,
  validatePayPalCreateOrder,
  validateOrderCreate,
  validatePaystackInitialize,
  validateOrderStatusUpdate
} = require('../middleware/validateRequest');

function createMockRequest(bodyData = {}, queryData = {}, paramsData = {}) {
  return {
    body: bodyData,
    query: queryData,
    params: paramsData
  };
}

async function runValidators(req, validators) {
  for (const validator of validators) {
    await validator(req, {}, () => {});
  }
  return validationResult(req);
}

async function assertValidation(name, validators, requestBody, shouldPass) {
  const req = createMockRequest(requestBody);
  const result = await runValidators(req, validators);
  const passed = result.isEmpty();

  console.log(`${passed ? '✓' : '✗'} ${name}`);
  if (passed !== shouldPass) {
    console.error(`   Expected ${shouldPass ? 'pass' : 'fail'} but got ${passed ? 'pass' : 'fail'}`);
    if (!passed) {
      console.error('   Errors:', result.array());
    }
    process.exitCode = 1;
  }
}

(async function runSuite() {
  console.log('📋 Validation Test Suite\n');

  await assertValidation('Valid registration', validateRegister, {
    email: 'user@example.com',
    password: 'SecurePass123!',
    firstName: 'John',
    lastName: 'Doe'
  }, true);

  await assertValidation('Invalid email format', validateRegister, {
    email: 'not-an-email',
    password: 'SecurePass123!'
  }, false);

  await assertValidation('Weak password (too short)', validateRegister, {
    email: 'user@example.com',
    password: 'weak'
  }, false);

  await assertValidation('Valid login', validateLogin, {
    email: 'user@example.com',
    password: 'SecurePass123!'
  }, true);

  await assertValidation('Invalid currency code', validatePayPalCreateOrder, {
    amount: 50,
    currency: 'INVALID'
  }, false);

  await assertValidation('Valid PayPal order payload', validatePayPalCreateOrder, {
    amount: 99.99,
    currency: 'USD',
    items: [{ productId: '123', name: 'Test Product', quantity: 1, price: 19.99 }]
  }, true);

  await assertValidation('Valid order creation payload', validateOrderCreate, {
    items: [{ productId: '123', name: 'Test Product', quantity: 2, price: 19.99 }],
    amount: 39.98,
    paymentMethod: 'paypal',
    shippingAddress: {
      firstName: 'John',
      lastName: 'Doe',
      phone: '+1 (555) 123-4567',
      street: '123 Main St',
      city: 'Helsinki',
      state: 'Uusimaa',
      country: 'Finland',
      zipCode: '00100'
    }
  }, true);

  await assertValidation('Invalid order creation payload missing address', validateOrderCreate, {
    items: [{ productId: '123', name: 'Test Product', quantity: 2, price: 19.99 }],
    amount: 39.98,
    paymentMethod: 'paypal',
    shippingAddress: {}
  }, false);

  await assertValidation('Valid Paystack initialization payload', validatePaystackInitialize, {
    amount: 150,
    currency: 'NGN'
  }, true);

  await assertValidation('Invalid Paystack initialization payload', validatePaystackInitialize, {
    amount: 50,
    currency: 'NGN'
  }, false);

  await assertValidation('Valid order status update', validateOrderStatusUpdate, {
    status: 'shipped'
  }, true);

  await assertValidation('Invalid order status update', validateOrderStatusUpdate, {
    status: 'not-a-status'
  }, false);

  console.log('\nValidation test suite complete.');
})();
