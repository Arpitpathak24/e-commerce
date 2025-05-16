require('dotenv').config(); // Must be at the top

const express = require('express');
const app = express();
const path = require('path');
const session = require('express-session');
const nodemailer = require('nodemailer');
const admin = require('firebase-admin');

// Load Firebase service account from environment variable
const serviceAccount = JSON.parse(process.env.FIREBASE_CONFIG);

// Initialize Firebase Admin SDK once
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');

app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true
}));

// Middleware to check Firebase auth token
function checkAuth(req, res, next) {
  const idToken = req.session.idToken;
  if (!idToken) return res.redirect('/register');

  admin.auth().verifyIdToken(idToken)
    .then(decodedToken => {
      req.user = decodedToken;
      next();
    })
    .catch(() => res.redirect('/register'));
}

// Routes
app.get('/', (req, res) => res.render('home'));
app.get('/shop', (req, res) => res.render('shop'));
app.get('/product/:id', (req, res) => res.render('product'));
app.get('/cart', (req, res) => {
  const cart = req.session.cart || [];
  res.render('cart', { cart });
});
app.get('/checkout', checkAuth, (req, res) => {
  const cart = req.session.cart || [];
  res.render('checkout', { cart });
});
app.get('/login', (req, res) => res.render('login'));
app.get('/register', (req, res) => res.render('register'));
app.get('/about', (req, res) => res.render('about'));
app.get('/contact', (req, res) => res.render('contact'));

// Cart handling
app.post('/add-to-cart', (req, res) => {
  const { name, ingredients, benefits, price } = req.body;
  if (!req.session.cart) req.session.cart = [];
  req.session.cart.push({ name, ingredients, benefits, price: parseFloat(price) });
  res.redirect('/shop');
});

app.post('/remove-from-cart', (req, res) => {
  const itemIndex = req.body.itemIndex;
  const cart = req.session.cart || [];
  if (cart.length > itemIndex) cart.splice(itemIndex, 1);
  req.session.cart = cart;
  res.redirect('/cart');
});

app.post('/subscribe', (req, res) => {
  const email = req.body.email;
  console.log(`New subscriber: ${email}`);
  // Save to DB or file if needed
  res.redirect('/?subscribed=true');
});

// Nodemailer for sending order confirmation
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'your-email@gmail.com',
    pass: 'your-email-password'
  }
});

// Skin categories (example data)
const skinCategories = [
  { name: 'Acne', slug: 'acne', image: '/images/categories/acne.jpg' },
  { name: 'Acne Marks', slug: 'acne-marks', image: '/images/categories/acne-marks.jpg' },
  { name: 'Open Pores', slug: 'open-pores', image: '/images/categories/open-pores.jpg' },
  { name: 'Pigmentation', slug: 'pigmentation', image: '/images/categories/pigmentation.jpg' },
];

app.post('/complete-order', checkAuth, (req, res) => {
  const {
    fullName, email, phone, address, city,
    zip, country, cardNumber, expiryDate,
    cvv, paymentMethod, specialInstructions
  } = req.body;

  const cart = req.session.cart || [];

  const order = {
    fullName,
    email,
    phone,
    address,
    city,
    zip,
    country,
    paymentMethod,
    specialInstructions,
    cart,
    total: cart.reduce((sum, item) => sum + item.price, 0),
    date: new Date()
  };

  const mailOptions = {
    from: 'your-email@gmail.com',
    to: email,
    subject: 'Order Confirmation',
    text: `Thank you for your order, ${fullName}.\n\nOrder details:\n${JSON.stringify(order)}`
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) console.log(error);
    else console.log('Email sent: ' + info.response);
  });

  req.session.cart = [];
  res.render('order-confirmation', { order });
});

// Session Login from client
app.post('/sessionLogin', async (req, res) => {
  const idToken = req.body.idToken;
  if (!idToken) return res.status(400).send('Missing ID Token');

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.session.idToken = idToken;
    res.status(200).send('Logged in');
  } catch (err) {
    res.status(401).send('Invalid ID token');
  }
});

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
