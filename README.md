# ShopAida

A Node.js + Express ecommerce backend with a static frontend site.

## Getting Started

1. Install dependencies
   ```bash
   npm install
   ```

2. Create a `.env` file in the project root using `.env.example` as a template.

3. Start the backend server:
   ```bash
   npm start
   ```

4. For local frontend preview, start the static server:
   ```bash
   npm run static
   ```

## Available URLs

- Backend API: `http://localhost:3000`
- Static frontend: `http://localhost:5500`

## Frontend Pages

Open any of these HTML files in the browser after starting `serve.js`:

- `index.html`
- `login.html`
- `register.html`
- `cart.html`
- `categories.html`
- `profile.html`
- `admin.html`
- `order-success.html`

## Backend API Endpoints

The backend exposes these main routes:

### Authentication
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

### Products
- `GET /api/products`
- `GET /api/products/categories`
- `GET /api/products/tags`
- `GET /api/products/:productId`
- `POST /api/products` (admin)
- `PUT /api/products/:productId` (admin)
- `DELETE /api/products/:productId` (admin)

### Orders
- `GET /api/orders`
- `GET /api/orders/:orderId`
- `POST /api/orders`
- `PATCH /api/orders/:orderId/status` (admin)
- `DELETE /api/orders/:orderId`

### Payments
- `POST /api/payments/paypal/create-order`
- `POST /api/payments/paypal/capture-order`
- `POST /api/payments/paystack/initialize`
- `GET /api/payments/paystack/verify/:reference`
- `POST /api/payments/stripe/create-payment-intent`
- `POST /api/payments/stripe/webhook`

### Admin
- `GET /api/admin/overview`
- `GET /api/admin/orders`
- `GET /api/admin/products`
- `GET /api/admin/activity`

Additional OAuth routes are available under `/auth`.

## Scripts

- `npm install` — install dependencies
- `npm start` — run the backend server
- `npm run start:prod` — run the backend in production mode
- `npm run dev` — run backend in development mode with `NODE_ENV=development`
- `npm run static` — start the local static frontend server
- `npm run lint` — lint JavaScript files using ESLint
- `npm test` — run the validation test suite

## Environment Variables

Copy `.env.example` to `.env` and fill in the required values.

Required values include:

- `PORT` - backend port
- `JWT_SECRET` - JSON Web Token secret
- `MONGODB_URI` - MongoDB connection string
- `STRIPE_SECRET_KEY` - Stripe API secret key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook signing secret

Optional values:

- social OAuth credentials
- PayPal and Paystack credentials

## Notes

- The backend server uses `process.env.PORT || 3000`.
- The static server uses `process.env.PORT || 5500`.
- For a different backend port, set `PORT` in `.env`.
