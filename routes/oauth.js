const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const User = require('../models/User');
const { generateToken } = require('../utils/jwt');

const router = express.Router();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID || '';
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET || '';
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || 'http://localhost:5500';

// In production, use Redis
const oauthStateStore = new Map();

function createOAuthState(redirect) {
  const state = crypto.randomBytes(16).toString('hex');
  oauthStateStore.set(state, {
    redirect,
    createdAt: Date.now(),
    expiresAt: Date.now() + 10 * 60 * 1000
  });
  return state;
}

function consumeOAuthState(state) {
  const entry = oauthStateStore.get(state);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    oauthStateStore.delete(state);
    return null;
  }
  oauthStateStore.delete(state);
  return entry;
}

function getBaseUrl(req) {
  return `${req.protocol}://${req.get('host')}`;
}

// Google OAuth
router.get('/google', (req, res) => {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return res.status(500).json({ error: 'Google OAuth not configured' });
  }

  const redirect = req.query.redirect || `${PUBLIC_BASE_URL}/auth-success.html`;
  const state = createOAuthState(redirect);
  const redirectUri = `${getBaseUrl(req)}/auth/google/callback`;

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account'
  });

  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

router.get('/google/callback', async (req, res, next) => {
  try {
    const { code, state } = req.query;
    const stateEntry = consumeOAuthState(state);

    if (!stateEntry) {
      return res.redirect(`${PUBLIC_BASE_URL}/login.html?error=invalid_state`);
    }

    const redirectUri = `${getBaseUrl(req)}/auth/google/callback`;
    const tokenParams = new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    });

    const tokenResp = await axios.post('https://oauth2.googleapis.com/token', tokenParams.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const idToken = tokenResp.data.id_token || '';
    const payload = idToken.split('.')[1]
      ? JSON.parse(Buffer.from(idToken.split('.')[1], 'base64').toString('utf8'))
      : {};

    const email = payload.email || '';
    const name = payload.name || '';
    const oauthId = payload.sub || '';

    let user = await User.findOne({ email });
    if (!user) {
      user = new User({
        email,
        firstName: name.split(' ')[0] || '',
        lastName: name.split(' ')[1] || '',
        oauthProvider: 'google',
        oauthId,
        emailVerified: true
      });
      await user.save();
    }

    const token = generateToken(user._id, user.email);
    const successUrl = new URL(stateEntry.redirect);
    successUrl.searchParams.set('token', token);
    successUrl.searchParams.set('provider', 'google');
    res.redirect(successUrl.toString());
  } catch (err) {
    next(err);
    res.redirect(`${PUBLIC_BASE_URL}/login.html?error=oauth_failed`);
  }
});

// Facebook OAuth
router.get('/facebook', (req, res) => {
  if (!FACEBOOK_APP_ID || !FACEBOOK_APP_SECRET) {
    return res.status(500).json({ error: 'Facebook OAuth not configured' });
  }

  const redirect = req.query.redirect || `${PUBLIC_BASE_URL}/auth-success.html`;
  const state = createOAuthState(redirect);
  const redirectUri = `${getBaseUrl(req)}/auth/facebook/callback`;

  const params = new URLSearchParams({
    client_id: FACEBOOK_APP_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'email,public_profile',
    state
  });

  res.redirect(`https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`);
});

router.get('/facebook/callback', async (req, res, next) => {
  try {
    const { code, state } = req.query;
    const stateEntry = consumeOAuthState(state);

    if (!stateEntry) {
      return res.redirect(`${PUBLIC_BASE_URL}/login.html?error=invalid_state`);
    }

    const redirectUri = `${getBaseUrl(req)}/auth/facebook/callback`;
    const tokenUrl = new URL('https://graph.facebook.com/v19.0/oauth/access_token');
    tokenUrl.searchParams.set('client_id', FACEBOOK_APP_ID);
    tokenUrl.searchParams.set('client_secret', FACEBOOK_APP_SECRET);
    tokenUrl.searchParams.set('redirect_uri', redirectUri);
    tokenUrl.searchParams.set('code', code);

    const tokenResp = await axios.get(tokenUrl.toString());
    const accessToken = tokenResp.data.access_token;

    const profileUrl = new URL('https://graph.facebook.com/me');
    profileUrl.searchParams.set('fields', 'id,name,email');
    profileUrl.searchParams.set('access_token', accessToken);
    const profileResp = await axios.get(profileUrl.toString());

    const email = profileResp.data.email || '';
    const name = profileResp.data.name || '';
    const oauthId = profileResp.data.id || '';

    let user = await User.findOne({ email });
    if (!user) {
      user = new User({
        email,
        firstName: name.split(' ')[0] || '',
        lastName: name.split(' ')[1] || '',
        oauthProvider: 'facebook',
        oauthId,
        emailVerified: true
      });
      await user.save();
    }

    const token = generateToken(user._id, user.email);
    const successUrl = new URL(stateEntry.redirect);
    successUrl.searchParams.set('token', token);
    successUrl.searchParams.set('provider', 'facebook');
    res.redirect(successUrl.toString());
  } catch (err) {
    next(err);
    res.redirect(`${PUBLIC_BASE_URL}/login.html?error=oauth_failed`);
  }
});

module.exports = router;
