# ShopAida - Quick Start Guide

## Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or Atlas)
- npm or yarn

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Create Environment File
Copy `.env.example` to `.env` and configure:
```bash
cp .env.example .env
```

**Minimum Required Configuration:**
```env
JWT_SECRET=your-super-secret-key-min-32-characters
MONGODB_URI=mongodb://localhost:27017/shopaida
NODE_ENV=development
ALLOW_NO_DB=true
```

To generate a secure JWT_SECRET:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Start MongoDB (if local)
```bash
# Windows
net start MongoDB

# macOS/Linux
sudo systemctl start mongod
```

### 4. Start the Server
```bash
npm start
```

The server will run on `http://localhost:3000`

### 5. Serve Frontend
In a separate terminal:
```bash
npm run serve
```

The frontend will be available at `http://localhost:5500`

## Testing the Application

### 1. Open the Frontend
Navigate to: `http://localhost:5500`

### 2. Register a New Account
- Go to Register page
- Use a valid email
- Password must have:
  - Minimum 8 characters
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one number
  - At least one special character (@$!%*?&)
- Example: `TestUser123!`

### 3. Test the Application
- Browse products
- Add items to cart
- View cart
- Test authentication (login/logout)

## Payment Gateway Setup (Optional)

### PayPal Sandbox
1. Create account at: https://developer.paypal.com
2. Get sandbox credentials
3. Add to `.env`:
```env
PAYPAL_CLIENT_ID=your-sandbox-client-id
PAYPAL_SECRET=your-sandbox-secret
PAYPAL_ENV=sandbox
```

### Paystack
1. Create account at: https://paystack.com
2. Get test keys
3. Add to `.env`:
```env
PAYSTACK_SECRET_KEY=your-test-secret-key
```

## OAuth Setup (Optional)

### Google OAuth
1. Go to: https://console.cloud.google.com
2. Create OAuth 2.0 credentials
3. Add authorized redirect URI: `http://localhost:3000/auth/google/callback`
4. Add to `.env`:
```env
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### Facebook OAuth
1. Go to: https://developers.facebook.com
2. Create app and get credentials
3. Add redirect URI: `http://localhost:3000/auth/facebook/callback`
4. Add to `.env`:
```env
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret
```

## Common Issues & Solutions

### Issue: Server won't start
**Error:** `JWT_SECRET environment variable is required`
**Solution:** Create `.env` file with JWT_SECRET

### Issue: Can't connect to database
**Error:** `MongoDB connection error`
**Solutions:**
- Check MongoDB is running
- Verify MONGODB_URI in `.env`
- For development, set `ALLOW_NO_DB=true` in `.env`

### Issue: CORS errors
**Solution:** Ensure frontend runs on `http://localhost:5500` or update CORS settings in `server.js`

### Issue: Port already in use
**Solution:** Change PORT in `.env` or kill process using the port:
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:3000 | xargs kill -9
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Orders
- `GET /api/orders` - Get user orders
- `GET /api/orders/:id` - Get specific order

### Payments
- `POST /api/payments/paypal/create-order` - Create PayPal order
- `POST /api/payments/paypal/capture-order` - Capture PayPal payment
- `POST /api/payments/paystack/initialize` - Initialize Paystack payment
- `GET /api/payments/paystack/verify/:ref` - Verify Paystack payment

### OAuth
- `GET /auth/google` - Google OAuth login
- `GET /auth/facebook` - Facebook OAuth login

## Development Commands

```bash
# Start server (production mode)
npm start

# Start server (development mode with auto-reload)
npm run dev

# Serve frontend
npm run serve

# Generate product pages
npm run generate
```

## Project Structure

```
ShopAida/
├── server.js           # Main server file
├── db.js              # Database connection
├── package.json       # Dependencies
├── .env               # Environment variables (create this)
├── .env.example       # Environment template
├── middleware/        # Express middleware
│   ├── auth.js       # Authentication
│   ├── validation.js # Input validation
│   ├── errorHandler.js
│   └── securityConfig.js
├── models/           # Database models
│   ├── User.js
│   └── Order.js
├── routes/           # API routes
│   ├── auth.js
│   ├── payments.js
│   ├── orders.js
│   └── oauth.js
├── utils/            # Utilities
│   ├── jwt.js
│   └── sanitizer.js
├── Frontend files    # HTML, CSS, JS
│   ├── index.html
│   ├── login.html
│   ├── register.html
│   ├── cart.html
│   ├── script.js
│   ├── cart.js
│   └── style.css
└── Documentation
    ├── SECURITY.md
    ├── PHASE3_SUMMARY.md
    ├── QUICK_REFERENCE.md
    └── APPLICATION_REVIEW_FIXES.md
```

## Security Notes

- Never commit `.env` file to version control
- Use strong JWT_SECRET in production (32+ characters)
- Enable HTTPS in production
- Set `NODE_ENV=production` in production
- Update CORS origins for production domain
- Regularly update dependencies: `npm audit fix`

## Support & Documentation

- **Security Documentation:** [SECURITY.md](SECURITY.md)
- **Implementation Summary:** [PHASE3_SUMMARY.md](PHASE3_SUMMARY.md)
- **Quick Reference:** [QUICK_REFERENCE.md](QUICK_REFERENCE.md)
- **Review & Fixes:** [APPLICATION_REVIEW_FIXES.md](APPLICATION_REVIEW_FIXES.md)

## Next Steps

1. ✅ Complete setup following this guide
2. ✅ Test basic functionality (browse, add to cart)
3. ✅ Test authentication (register, login)
4. ⏭️ Configure payment gateways (if needed)
5. ⏭️ Configure OAuth providers (if needed)
6. ⏭️ Deploy to production

---

**Happy Coding! 🚀**

For issues or questions, refer to the documentation files or review the code comments.
