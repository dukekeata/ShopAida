/* exported updateQty, removeFromCart */
// Load cart from localStorage and display items with images and prices
const API_BASE = window.API_BASE || `${window.location.protocol}//${window.location.hostname}:3000`;

function renderCart() {
  let cart = [];
  try {
    cart = JSON.parse(localStorage.getItem('cart')) || [];
  } catch(e) { cart = []; }
  const cartDiv = document.getElementById('cart');
  const totalDiv = document.getElementById('total');
  cartDiv.innerHTML = '';
  if (cart.length === 0) {
    cartDiv.innerHTML = '<em>No items in cart.</em>';
    totalDiv.textContent = '';
    updateCartIcon();
    return;
  }
  let total = 0;
  cart.forEach(item => {
    total += item.price * item.qty;
    const div = document.createElement('div');
    div.className = 'cart-item';
    div.innerHTML = `
      <img src="${item.image}" alt="${item.name}" style="width:60px;height:60px;object-fit:cover;border-radius:8px;margin-right:12px;" onerror="this.onerror=null;this.src='./images/placeholder.svg';" />
      <span style="font-weight:500;">${item.name}</span>
      <span style="margin-left:12px;">
        ${window.ShopAida && window.ShopAida.formatCurrency ? window.ShopAida.formatCurrency(item.price * item.qty) : '₦' + (item.price * item.qty).toLocaleString()}
      </span>
      <input type="number" min="1" value="${item.qty}" style="width:48px;margin-left:12px;" onchange="updateQty('${item.id}', this.value)" />
      <button onclick="removeFromCart('${item.id}')" style="margin-left:10px;background:#e53935;color:#fff;border:none;border-radius:4px;padding:4px 10px;cursor:pointer;">Remove</button>
    `;
    cartDiv.appendChild(div);
  });
  totalDiv.textContent = `Subtotal: ${window.ShopAida && window.ShopAida.formatCurrency ? window.ShopAida.formatCurrency(total) : '₦' + total.toLocaleString()}`;
  const checkoutBtn = document.getElementById('checkoutBtn');
  if (checkoutBtn) {
    checkoutBtn.disabled = cart.length === 0;
  }
  updateCartIcon();
} 

function updateQty(id, qty) {
  let cart = [];
  try {
    cart = JSON.parse(localStorage.getItem('cart')) || [];
  } catch(e) { cart = []; }
  const item = cart.find(i => String(i.id) === String(id));
  if (item && qty > 0) {
    item.qty = parseInt(qty);
    localStorage.setItem('cart', JSON.stringify(cart));
    renderCart();
  }
}

function removeFromCart(id) {
  let cart = [];
  try {
    cart = JSON.parse(localStorage.getItem('cart')) || [];
  } catch(e) { cart = []; }
  cart = cart.filter(item => String(item.id) !== String(id));
  localStorage.setItem('cart', JSON.stringify(cart));
  renderCart();
}

function getCartTotal() {
  let cart = [];
  try { cart = JSON.parse(localStorage.getItem('cart')) || []; } catch(e) { cart = []; }
  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  return parseFloat(total.toFixed(2));
}

function getCartItems() {
  let cart = [];
  try { cart = JSON.parse(localStorage.getItem('cart')) || []; } catch(e) { cart = []; }
  return cart.map(item => ({
    productId: item.id,
    name: item.name,
    price: item.price,
    quantity: item.qty,
    image: item.image
  }));
}

function getShippingAddress() {
  return {
    firstName: document.getElementById('shipFirst')?.value.trim(),
    lastName: document.getElementById('shipLast')?.value.trim(),
    phone: document.getElementById('shipPhone')?.value.trim(),
    street: document.getElementById('shipStreet')?.value.trim(),
    city: document.getElementById('shipCity')?.value.trim(),
    state: document.getElementById('shipState')?.value.trim(),
    country: document.getElementById('shipCountry')?.value.trim(),
    zipCode: document.getElementById('shipZip')?.value.trim()
  };
}

function validateShippingAddress(address) {
  if (!address.firstName) return 'Please enter a first name.';
  if (!address.phone) return 'Please enter a phone number.';
  if (!address.street) return 'Please enter a street address.';
  if (!address.city) return 'Please enter a city.';
  if (!address.state) return 'Please enter a state or region.';
  if (!address.country) return 'Please enter a country.';
  if (!address.zipCode) return 'Please enter a ZIP or postal code.';
  return '';
}

function showCheckoutStatus(message, isError = false) {
  const status = document.getElementById('checkoutStatus');
  if (!status) return;
  status.textContent = message || '';
  status.style.color = isError ? '#d32f2f' : '#114b8c';
  status.style.display = message ? 'block' : 'none';
}

async function createOrder(paymentMethod, paymentReference, shippingAddress) {
  const payload = {
    items: getCartItems(),
    amount: getCartTotal(),
    currency: 'USD',
    paymentMethod,
    paymentReference,
    shippingAddress
  };

  const response = await fetch(`${API_BASE}/api/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    credentials: 'include',
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Could not create order.');
  }
  return data;
}

function clearCart() {
  localStorage.removeItem('cart');
  renderCart();
}

function getAuthHeaders() {
  const token = localStorage.getItem('authToken') || '';
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function updateCartIcon(shouldPulse = false) {
  const icon = document.querySelector('.fa-shopping-cart');
  if (!icon) return;
  let cartArr = [];
  try { cartArr = JSON.parse(localStorage.getItem('cart')) || []; } catch(e) { cartArr = []; }
  const count = cartArr.reduce((sum, item) => sum + (item.qty || 0), 0);
  let badge = document.getElementById('cart-badge');
  if (!badge) {
    badge = document.createElement('span');
    badge.id = 'cart-badge';
    if (icon.parentElement) {
      // ensure parent has relative positioning so absolute badge positions correctly
      if (getComputedStyle(icon.parentElement).position === 'static') {
        icon.parentElement.style.position = 'relative';
      }
      icon.parentElement.appendChild(badge);
    }
  }
  badge.textContent = count > 0 ? count : '';
  
  // Add pulse animation when badge is updated with items added
  if (shouldPulse && count > 0) {
    badge.classList.remove('pulse');
    // Trigger reflow to restart animation
    void badge.offsetWidth;
    badge.classList.add('pulse');
  }
}

async function initCheckout() {
  const checkoutBtn = document.getElementById('checkoutBtn');
  const paymentSection = document.getElementById('payment');
  const paymentMessage = document.getElementById('payment-message');
  if (!checkoutBtn || !paymentSection) return;

  checkoutBtn.addEventListener('click', (e) => {
    e.preventDefault();
    console.log('checkout clicked');
    const user = localStorage.getItem('user');
    if (!user) {
      // User not logged in — redirect to login and remember to come back to cart
      localStorage.setItem('afterLoginRedirect', 'cart.html');
      window.location.href = 'login.html';
      return;
    }

    showCheckoutStatus('Please enter your shipping details and select a payment option.', false);
    paymentSection.style.display = 'block';
    checkoutBtn.style.display = 'none';
    renderStripePayment();
    renderPaystackButton();
    // renderPayPalButtons();
  });

  function showMessage(msg, visible = true) {
    if (!paymentMessage) return;
    paymentMessage.style.display = visible ? 'block' : 'none';
    paymentMessage.textContent = msg;
  }

  // Render PayPal Buttons (idempotent)
  function renderPayPalButtons() {
    const container = document.getElementById('paypal-button-container');
    if (container && container.children.length > 0) return; // already rendered
    if (!window.paypal) {
      // PayPal SDK isn't available yet — try to wait for it if the script tag exists
      const sdkScript = document.querySelector('script[src*="paypal.com/sdk"]');
      if (sdkScript) {
        showMessage('Loading PayPal...', true);
        const onLoad = function() {
          sdkScript.removeEventListener('load', onLoad);
          showMessage('', false);
          renderPayPalButtons();
        };
        // If the script already finished loading, trigger immediately
        if (sdkScript.readyState === 'complete' || sdkScript.getAttribute('data-loaded') === 'true') {
          showMessage('', false);
          // small delay to ensure window.paypal is available
          setTimeout(renderPayPalButtons, 50);
        } else {
          sdkScript.addEventListener('load', onLoad);
        }
        return;
      }
      console.warn('PayPal SDK not loaded');
      showMessage('PayPal SDK not loaded. Please try again later.', true);
      return;
    }
    window.paypal.Buttons({
      onClick: function(data, actions) {
        const shippingAddress = getShippingAddress();
        const validationError = validateShippingAddress(shippingAddress);
        if (validationError) {
          showCheckoutStatus(validationError, true);
          return actions.reject();
        }
        return actions.resolve();
      },
      createOrder: async function() {
        const amount = getCartTotal();
        try {
          const res = await fetch(`${API_BASE}/api/payments/paypal/create-order`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...getAuthHeaders()
            },
            credentials: 'include',
            body: JSON.stringify({ amount, items: getCartItems() })
          });
          const data = await res.json();
          if (data && data.id) return data.id;
          throw new Error('Failed to create order');
        } catch (err) {
          showMessage('Error creating order: ' + err.message, true);
          throw err;
        }
      },
      onApprove: async function(data) {
        showMessage('Capturing payment...');
        try {
          const res = await fetch(`${API_BASE}/api/payments/paypal/capture-order`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...getAuthHeaders()
            },
            credentials: 'include',
            body: JSON.stringify({ orderID: data.orderID, amount: getCartTotal(), items: getCartItems() })
          });
          const capture = await res.json();
          if (capture && !capture.error) {
            const amount = getCartTotal();
            const shippingAddress = getShippingAddress();
            try {
              const order = await createOrder('paypal', data.orderID, shippingAddress);
              showMessage('Payment successful! Your order has been recorded.', false);
              clearCart();
              setTimeout(() => {
                window.location.href = `order-success.html?orderId=${encodeURIComponent(order._id || order.id)}&amount=${encodeURIComponent(amount)}&status=completed&reference=${encodeURIComponent(data.orderID)}`;
              }, 1200);
            } catch (orderErr) {
              showMessage('Payment completed, but order save failed: ' + orderErr.message, true);
            }
          } else {
            showMessage('Payment failed: ' + (capture.error || 'Unknown error'), true);
          }
        } catch (err) {
          showMessage('Capture error: ' + err.message, true);
        }
      },
      onError: function(err) {
        showMessage('Payment error: ' + (err && err.message ? err.message : err), true);
      }
    }).render('#paypal-button-container');
  }

  // Render Stripe Payment
  function renderStripePayment() {
    const btn = document.getElementById('stripePayBtn');
    const msg = document.getElementById('stripe-message');
    if (!btn) return;
    if (btn.getAttribute('data-bound') === 'true') return;
    btn.setAttribute('data-bound', 'true');

    if (!window.STRIPE_PUBLIC_KEY) {
      if (msg) msg.textContent = 'Stripe public key not configured.';
      return;
    }
    if (!window.Stripe) {
      if (msg) msg.textContent = 'Stripe SDK not loaded. Please refresh.';
      return;
    }

    const stripe = window.Stripe(window.STRIPE_PUBLIC_KEY);
    const elements = stripe.elements();
    const style = {
      base: {
        color: '#32325d',
        fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
        fontSmoothing: 'antialiased',
        fontSize: '16px',
        '::placeholder': {
          color: '#aab7c4'
        }
      },
      invalid: {
        color: '#fa755a',
        iconColor: '#fa755a'
      }
    };
    const cardElement = elements.create('card', {style});
    
    // Check if the DOM element exists before mounting
    const cardMountNode = document.getElementById('stripe-card-element');
    if (!cardMountNode) return;
    
    // Check if already mounted (Stripe element handles this, but avoids duplicate mounts)
    if (cardMountNode.hasChildNodes()) {
      cardElement.unmount();
    }
    cardElement.mount('#stripe-card-element');

    cardElement.on('change', function(event) {
      if (event.error) {
        if (msg) msg.textContent = event.error.message;
      } else {
        if (msg) msg.textContent = '';
      }
    });

    btn.addEventListener('click', async () => {
      const total = getCartTotal();
      if (!total || total <= 0) {
        if (msg) msg.textContent = 'Your cart is empty.';
        return;
      }

      const shippingAddress = getShippingAddress();
      const validationError = validateShippingAddress(shippingAddress);
      if (validationError) {
        if (msg) msg.textContent = validationError;
        showCheckoutStatus(validationError, true);
        return;
      }

      if (msg) msg.textContent = 'Processing...';
      btn.disabled = true;

      try {
        const res = await fetch(`${API_BASE}/api/payments/stripe/create-payment-intent`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders()
          },
          credentials: 'include',
          body: JSON.stringify({
            amount: Math.round(total * 100),
            currency: 'usd',
            items: getCartItems()
          })
        });

        const data = await res.json();
        if (!res.ok || !data.clientSecret) {
          throw new Error(data.error || 'Failed to initialize Stripe payment');
        }

        const { error, paymentIntent } = await stripe.confirmCardPayment(data.clientSecret, {
          payment_method: {
            card: cardElement,
            billing_details: {
              name: `${shippingAddress.firstName} ${shippingAddress.lastName}`.trim(),
              email: JSON.parse(localStorage.getItem('user') || '{}').email,
              phone: shippingAddress.phone,
              address: {
                line1: shippingAddress.street,
                city: shippingAddress.city,
                state: shippingAddress.state,
                country: shippingAddress.country,
                postal_code: shippingAddress.zipCode
              }
            }
          }
        });

        if (error) {
          if (msg) msg.textContent = error.message;
          btn.disabled = false;
        } else if (paymentIntent && paymentIntent.status === 'succeeded') {
          if (msg) msg.textContent = 'Payment successful! Creating order...';
          
          try {
            const order = await createOrder('stripe', paymentIntent.id, shippingAddress);
            showCheckoutStatus('Payment and order confirmed. Redirecting...', false);
            clearCart();
            setTimeout(() => { 
                window.location.href = `order-success.html?orderId=${encodeURIComponent(order._id || order.id)}&amount=${encodeURIComponent(total.toFixed(2))}&status=completed&reference=${encodeURIComponent(paymentIntent.id)}`; 
            }, 1400);
          } catch (orderErr) {
            if (msg) msg.textContent = 'Payment completed, but order save failed: ' + orderErr.message;
            btn.disabled = false;
          }
        }
      } catch (err) {
        if (msg) msg.textContent = `Stripe error: ${err.message}`;
        btn.disabled = false;
      }
    });
  }

  // Render Paystack Button
  function renderPaystackButton() {
    const btn = document.getElementById('paystackBtn');
    const msg = document.getElementById('paystack-message');
    if (!btn) return;
    if (btn.getAttribute('data-bound') === 'true') return;
    btn.setAttribute('data-bound', 'true');

    btn.addEventListener('click', async () => {
      const shippingAddress = getShippingAddress();
      const validationError = validateShippingAddress(shippingAddress);
      if (validationError) {
        if (msg) msg.textContent = validationError;
        showCheckoutStatus(validationError, true);
        return;
      }

      const publicKey = window.PAYSTACK_PUBLIC_KEY || '';
      const currency = window.PAYSTACK_CURRENCY || 'NGN';
      if (!publicKey) {
        if (msg) msg.textContent = 'Enter your Paystack public key to enable payments.';
        return;
      }
      if (!window.PaystackPop) {
        if (msg) msg.textContent = 'Paystack SDK not loaded. Please refresh.';
        return;
      }

      const total = getCartTotal();
      if (!total || total <= 0) {
        if (msg) msg.textContent = 'Your cart is empty.';
        return;
      }

      let email = '';
      try {
        const userObj = JSON.parse(localStorage.getItem('user') || '{}');
        email = userObj.email || '';
      } catch (e) { /* ignore */ }
      if (!email) {
        email = prompt('Enter your email for receipt:') || '';
      }
      if (!email) {
        if (msg) msg.textContent = 'Email is required for Paystack.';
        return;
      }

      if (msg) msg.textContent = 'Initializing Paystack…';

      try {
        const initRes = await fetch(`${API_BASE}/api/payments/paystack/initialize`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders()
          },
          credentials: 'include',
          body: JSON.stringify({
            amount: Math.round(total * 100),
            currency,
            metadata: {
              items: getCartItems(),
              cartTotal: total.toFixed(2)
            }
          })
        });

        const initData = await initRes.json();
        if (!initRes.ok || !initData.data || !initData.data.access_code) {
          throw new Error(initData.error || 'Failed to initialize Paystack');
        }

        if (msg) msg.textContent = 'Opening Paystack…';

        const handler = window.PaystackPop.setup({
          key: publicKey,
          email,
          access_code: initData.data.access_code,
          callback: function(response) {
            if (msg) msg.textContent = 'Payment successful! Verifying…';
            verifyPaystackPayment(response.reference);
          },
          onClose: function() {
            if (msg) msg.textContent = 'Payment cancelled.';
          }
        });
        handler.openIframe();
      } catch (err) {
        if (msg) msg.textContent = `Paystack error: ${err.message}`;
      }
    });
  }

  async function verifyPaystackPayment(reference) {
    const msg = document.getElementById('paystack-message');
    try {
      const res = await fetch(`${API_BASE}/api/payments/paystack/verify/${reference}`, {
        headers: {
          ...getAuthHeaders()
        },
        credentials: 'include'
      });
      const data = await res.json();
      if (res.ok && data.data && data.data.status === 'success') {
        if (msg) msg.textContent = 'Payment successful! Thank you.';
        const amount = getCartTotal();
        const shippingAddress = getShippingAddress();
        try {
          const order = await createOrder('paystack', reference, shippingAddress);
          showCheckoutStatus('Payment and order confirmed. Redirecting...', false);
          clearCart();
          setTimeout(() => { window.location.href = `order-success.html?orderId=${encodeURIComponent(order._id || order.id)}&amount=${encodeURIComponent(amount)}&status=completed&reference=${encodeURIComponent(reference)}`; }, 1400);
        } catch (orderErr) {
          if (msg) msg.textContent = 'Payment completed, but order save failed: ' + orderErr.message;
        }
      } else {
        if (msg) msg.textContent = 'Payment verification failed. Please contact support.';
      }
    } catch (err) {
      if (msg) msg.textContent = `Verification error: ${err.message}`;
    }
  }
}

window.updateQty = updateQty;
window.removeFromCart = removeFromCart;

document.addEventListener('DOMContentLoaded', function() {
  renderCart();
  initCheckout();
});
