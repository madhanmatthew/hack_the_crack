// Load environment variables from a .env file
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI; 
const JWT_SECRET = process.env.JWT_SECRET || '8308c1fb6618a0d7132680e73c4fd30fafcd1123e2b18d5fd384f19075071279';

if (!MONGO_URI) {
  console.error('MONGO_URI is not defined in the .env file!');
} else {
  mongoose.connect(MONGO_URI)
    .then(() => console.log('MongoDB connected successfully'))
    .catch(err => console.error('MongoDB connection error:', err));
}

// --- Database Schemas ---

// User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  image: { type: String, default: 'https://placehold.co/150x150/E2E8F0/A0AEC0?text=User' },
}, { timestamps: true });

// Product Schema
const productSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true },
  price: { type: Number, required: true },
  image: { type: String, default: 'https://placehold.co/400x300/E2E8F0/A0AEC0?text=No+Image' },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Product = mongoose.model('Product', productSchema);

// --- JWT Authentication Middleware ---
const authMiddleware = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).send({ error: 'Authentication failed. Token missing.' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).send({ error: 'Authentication failed. Invalid token.' });
  }
};

// --- API Routes ---

// Authentication Routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).send({ error: 'Please fill out all fields.' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, email, password: hashedPassword });
    await user.save();
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '1h' });
    res.status(201).send({ user: { username: user.username, email: user.email }, token });
  } catch (error) {
    res.status(400).send({ error: 'Registration failed. User may already exist.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).send({ error: 'Invalid email or password.' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).send({ error: 'Invalid email or password.' });
    }
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '1h' });
    res.status(200).send({ user: { username: user.username, email: user.email }, token });
  } catch (error) {
    res.status(500).send({ error: 'Login failed. Please try again.' });
  }
});

app.get('/api/auth/profile', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    res.status(200).send(user);
  } catch (error) {
    res.status(500).send({ error: 'Failed to fetch profile.' });
  }
});

// Product Routes
app.get('/api/products', async (req, res) => {
  try {
    const { search, category } = req.query;
    const filter = {};
    if (search) {
      filter.title = { $regex: search, $options: 'i' };
    }
    if (category && category !== 'all') {
      filter.category = category;
    }
    const products = await Product.find(filter).populate('owner', 'username');
    res.status(200).send(products);
  } catch (error) {
    res.status(500).send({ error: 'Failed to fetch products.' });
  }
});

app.get('/api/products/my-listings', authMiddleware, async (req, res) => {
  try {
    const products = await Product.find({ owner: req.user.userId }).populate('owner', 'username');
    res.status(200).send(products);
  } catch (error) {
    res.status(500).send({ error: 'Failed to fetch user listings.' });
  }
});

app.post('/api/products', authMiddleware, async (req, res) => {
  try {
    const product = new Product({
      ...req.body,
      owner: req.user.userId,
    });
    await product.save();
    res.status(201).send(product);
  } catch (error) {
    res.status(400).send({ error: 'Failed to create product listing.' });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('owner', 'username');
    if (!product) {
      return res.status(404).send({ error: 'Product not found.' });
    }
    res.status(200).send(product);
  } catch (error) {
    res.status(500).send({ error: 'Failed to fetch product.' });
  }
});

app.delete('/api/products/:id', authMiddleware, async (req, res) => {
  try {
    const product = await Product.findOneAndDelete({ _id: req.params.id, owner: req.user.userId });
    if (!product) {
      return res.status(404).send({ error: 'Product not found or not authorized to delete.' });
    }
    res.status(200).send({ message: 'Product deleted successfully.' });
  } catch (error) {
    res.status(500).send({ error: 'Failed to delete product.' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});