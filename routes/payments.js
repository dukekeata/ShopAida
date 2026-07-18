const express = require('express');
const rateLimit = require('express-rate-limit');
const axios = require('axios');
const Stripe = require('stripe');
const Order = require('../models/Order');
const { authMiddleware } = require('../middleware/authMiddleware');
const { sanitizationMiddleware, sanitizeNumber, sanitizeQuery } = require('../utils/sanitizer');
const {
  validatePayPalCreateOrder,
  validatePayPalCaptureOrder,
  validatePaystackInitialize,
  validatePaystackVerify,
  validateStripeCreatePaymentIntent
} = require('../middleware/validateRequest');
const { sendOrderConfirmation } = require('../utils/email');
const User = require('../models/User');

const router = express.Router();

// Apply sanitization to all routes
router.use(sanitizationMiddleware);

const paymentLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3
});

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || '';
const PAYPAL_SECRET = process.env.PAYPAL_SECRET || '';
const PAYPAL_ENV = process.env.PAYPAL_ENV === 'live' ? 'live' : 'sandbox';
const PAYPAL_BASE = PAYPAL_ENV === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || '';
const stripe = Stripe(process.env.STRIPE_SECRET_KEY || '');

async function getPayPalAccessToken() {
  if (!PAYPAL_CLIENT_ID || !PAYPAL_SECRET) {
    throw new Error('Missing PayPal credentials');
  }

  const params = new URLSearchParams();
  params.append('grant_type', 'client_credentials');

  const resp = await axios.post(`${PAYPAL_BASE}/v1/oauth2/token`, params.toString(), {
    auth: { username: PAYPAL_CLIENT_ID, password: PAYPAL_SECRET },
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });

  return resp.data.access_token;
}

// PayPal create order
router.post('/paypal/create-order', authMiddleware, paymentLimiter, validatePayPalCreateOrder, async (req, res, next) => {
  try {
    const { amount, currency = 'NGN' } = req.body;
    const sanitizedAmount = sanitizeNumber(amount);

    const accessToken = await getPayPalAccessToken();
    const resp = await axios.post(
      `${PAYPAL_BASE}/v2/checkout/orders`,
      {
        intent: 'CAPTURE',
        purchase_units: [
          { amount: { currency_code: currency, value: sanitizedAmount.toFixed(2) } }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    res.json({ id: resp.data.id });
  } catch (err) {
    next(err);
  }
});

// PayPal capture order
router.post('/paypal/capture-order', authMiddleware, paymentLimiter, validatePayPalCaptureOrder, async (req, res, next) => {
  try {
    const { orderID, amount, items = [] } = req.body;
    const sanitizedOrderID = sanitizeQuery(orderID);

    const accessToken = await getPayPalAccessToken();
    const resp = await axios.post(
      `${PAYPAL_BASE}/v2/checkout/orders/${sanitizedOrderID}/capture`,
      {},
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (resp.data.status === 'COMPLETED') {
      const order = new Order({
        userId: req.user.userId,
        items,
        totalAmount: amount,
        paymentMethod: 'paypal',
        paymentReference: sanitizedOrderID,
        status: 'completed',
        completedAt: new Date(),
        events: [{ status: 'Order Placed', message: 'Payment successful via PayPal. Order confirmed.' }]
      });
      await order.save();
      
      const user = await User.findById(req.user.userId);
      if (user && user.email) {
        await sendOrderConfirmation(user.email, order);
      }
    }

    res.json(resp.data);
  } catch (err) {
    next(err);
  }
});

// Paystack initialize
router.post('/paystack/initialize', authMiddleware, paymentLimiter, validatePaystackInitialize, async (req, res, next) => {
  try {
    if (!PAYSTACK_SECRET_KEY) {
      return res.status(500).json({ error: 'Paystack not configured' });
    }

    const { amount, currency = 'NGN', metadata } = req.body;
    const sanitizedAmount = sanitizeNumber(amount) * 100; // Paystack expects amount in kobo

    const resp = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        email: req.user.email,
        amount: sanitizedAmount,
        currency,
        channels: ['card', 'bank', 'bank_transfer', 'ussd'],
        metadata: {
          userId: req.user.userId,
          ...metadata
        }
      },
      { headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` } }
    );

    res.json(resp.data);
  } catch (err) {
    next(err);
  }
});

// Paystack verify
router.get('/paystack/verify/:reference', authMiddleware, validatePaystackVerify, async (req, res, next) => {
  try {
    if (!PAYSTACK_SECRET_KEY) {
      return res.status(500).json({ error: 'Paystack not configured' });
    }

    const reference = sanitizeQuery(req.params.reference);
    const resp = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      { headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` } }
    );

    if (resp.data.data.status === 'success') {
      const order = new Order({
        userId: req.user.userId,
        items: resp.data.data.metadata?.items || [],
        totalAmount: resp.data.data.amount / 100,
        currency: resp.data.data.currency,
        paymentMethod: 'paystack',
        paymentReference: reference,
        status: 'completed',
        completedAt: new Date(),
        metadata: resp.data.data.metadata,
        events: [{ status: 'Order Placed', message: 'Payment successful via Paystack. Order confirmed.' }]
      });
      await order.save();
      
      const user = await User.findById(req.user.userId);
      if (user && user.email) {
        await sendOrderConfirmation(user.email, order);
      }
    }

    res.json(resp.data);
  } catch (err) {
    next(err);
  }
});

// Stripe create payment intent
router.post(
  '/stripe/create-payment-intent',
  authMiddleware,
  paymentLimiter,
  validateStripeCreatePaymentIntent,
  async (req, res, next) => {
    try {
      if (!process.env.STRIPE_SECRET_KEY) {
        return res.status(500).json({ error: 'Stripe is not configured' });
      }

      const { amount, currency = 'NGN', items = [] } = req.body;

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(parseFloat(amount) * 100),
        currency,
        metadata: {
          userId: req.user.userId,
          items: JSON.stringify(items)
        }
      });

      res.json({ clientSecret: paymentIntent.client_secret, id: paymentIntent.id });
    } catch (err) {
      next(err);
    }
  }
);

// Stripe webhook endpoint
router.post('/stripe/webhook', async (req, res, next) => {
  try {
    const signature = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      return res.status(500).json({ error: 'Stripe webhook secret is not configured' });
    }

    if (!signature) {
      return res.status(400).json({ error: 'Stripe signature header missing' });
    }

    const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body));
    const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);

    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object;
      const metadata = paymentIntent.metadata || {};
      const items = metadata.items ? JSON.parse(metadata.items) : [];

      const order = new Order({
        userId: metadata.userId || null,
        items,
        totalAmount: paymentIntent.amount_received / 100,
        currency: paymentIntent.currency.toUpperCase(),
        paymentMethod: 'stripe',
        paymentReference: paymentIntent.id,
        status: 'completed',
        completedAt: new Date(),
        metadata,
        events: [{ status: 'Order Placed', message: 'Payment successful via Stripe. Order confirmed.' }]
      });

      await order.save();
      
      if (metadata.userId) {
        const user = await User.findById(metadata.userId);
        if (user && user.email) {
          await sendOrderConfirmation(user.email, order);
        }
      }
    }

    res.json({ received: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
