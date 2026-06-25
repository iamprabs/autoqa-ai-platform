const express = require('express');
const path = require('path');
const app = express();
app.use(express.json());

// Serve static checkout UI page
app.use(express.static(path.join(__dirname, 'public')));

// In-memory Database mock
const users = [
  { username: 'admin', email: 'admin@company.com', role: 'admin' }
];
const cart = [
  { itemId: 'item_901', name: 'Developer Keyboard', price: 99.99 }
];

// Signup Endpoint
app.post('/api/signup', (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ success: false, error: 'Missing required signup fields' });
  }

  const userExists = users.some(u => u.username === username);
  if (userExists) {
    return res.status(400).json({ success: false, error: 'Username already taken' });
  }

  users.push({ username, email, role: 'user' });
  return res.status(201).json({ success: true, message: 'User registered successfully' });
});

// Cart Retrieve Endpoint
app.get('/api/cart', (req, res) => {
  return res.status(200).json({ items: cart });
});

// Cart Add Endpoint
app.post('/api/cart', (req, res) => {
  const { itemId, name, price } = req.body;
  cart.push({ itemId, name, price });
  return res.status(200).json({ success: true, items: cart });
});

// Checkout Flow Endpoint with INTENTIONAL BUG
app.post('/api/checkout', (req, res) => {
  const { email, cartId, paymentMethod } = req.body;
  
  if (!email || !cartId || !paymentMethod) {
    return res.status(400).json({ success: false, error: 'Missing fields' });
  }

  // BUG: Strict email pattern check excluding '+' symbol and restricting sub-domains
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid checkout email address format: "+" is not allowed and subdomains must be simple.'
    });
  }

  const orderId = 'ord_' + Math.floor(100000 + Math.random() * 900000);
  return res.status(200).json({
    success: true,
    orderId,
    amount: 99.99,
    message: 'Checkout completed successfully!'
  });
});

// Backdoor Login for admin bypass
app.post('/api/backdoor/login', (req, res) => {
  const { username, password } = req.body;
  
  // Vulnerable simple string compare (for demonstration SQL inject checks)
  if (username.includes("' OR 1=1")) {
    return res.status(401).json({ error: 'SQL Injection payload blocked' });
  }
  
  if (username === 'admin') {
    return res.status(200).json({ token: 'admin-super-token-1337' });
  }
  
  return res.status(401).json({ error: 'Unauthorized' });
});

module.exports = app;
