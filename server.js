require('dotenv').config();

const path = require('path');
const express = require('express');
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'dbRestaurants';
const PORT = process.env.PORT || 3000;

/* ---------- Database: dbRestaurants.restaurants ---------- */
const client = new MongoClient(MONGODB_URI);
let restaurants;

/* ---------- Validation (replaces the Mongoose schema rules) ---------- */
const PHONE_RX = /^(09\d{9}|\+639\d{9})$/;

function validateRestaurant(b = {}) {
  const str = (v) => String(v ?? '').trim();
  const doc = {
    name: str(b.name),
    cuisine: str(b.cuisine),
    address: str(b.address),
    rating: b.rating === undefined || b.rating === null || b.rating === '' ? NaN : Number(b.rating),
    contact: str(b.contact)
  };
  const errors = [];

  if (!doc.name) errors.push('Restaurant name is required');
  else if (doc.name.length < 2) errors.push('Name must be at least 2 characters');
  else if (doc.name.length > 80) errors.push('Name is too long');

  if (!doc.cuisine) errors.push('Cuisine is required');
  else if (doc.cuisine.length > 40) errors.push('Cuisine is too long');

  if (!doc.address) errors.push('Location is required');
  else if (doc.address.length > 120) errors.push('Location is too long');

  if (Number.isNaN(doc.rating)) errors.push('Rating is required');
  else if (doc.rating < 1 || doc.rating > 5) errors.push('Rating must be between 1 and 5');

  if (!doc.contact) errors.push('Contact number is required');
  else if (!PHONE_RX.test(doc.contact)) errors.push('Use a valid PH mobile number, e.g. 09171234567');

  if (errors.length) {
    throw Object.assign(new Error(errors[0]), { name: 'ValidationError', details: errors });
  }
  return doc;
}

/* ---------- App ---------- */
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function parseId(value) {
  const n = Number(value);
  if (!Number.isInteger(n)) {
    throw Object.assign(new Error('Invalid value provided'), { name: 'CastError' });
  }
  return n;
}

async function nextId() {
  const last = await restaurants
    .find()
    .sort({ restaurant_id: -1 })
    .limit(1)
    .project({ restaurant_id: 1 })
    .next();
  return (last?.restaurant_id || 0) + 1;
}

// List + search / filter / sort
app.get('/api/restaurants', wrap(async (req, res) => {
  const { q, cuisine, location, sort } = req.query;
  const filter = {};
  if (q) {
    const rx = { $regex: escapeRegex(String(q)), $options: 'i' };
    filter.$or = [{ name: rx }, { cuisine: rx }, { address: rx }];
  }
  if (cuisine) filter.cuisine = { $regex: `^${escapeRegex(String(cuisine))}$`, $options: 'i' };
  if (location) filter.address = { $regex: escapeRegex(String(location)), $options: 'i' };
  const sorts = {
    rating: { rating: -1, name: 1 },
    name: { name: 1 },
    recent: { updatedAt: -1 }
  };
  const items = await restaurants.find(filter).sort(sorts[sort] || { restaurant_id: 1 }).toArray();
  res.json(items);
}));

// Dashboard stats
app.get('/api/stats', wrap(async (req, res) => {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [total, recent, avg] = await Promise.all([
    restaurants.countDocuments(),
    restaurants.countDocuments({ updatedAt: { $gte: since } }),
    restaurants.aggregate([{ $group: { _id: null, avg: { $avg: '$rating' } } }]).toArray()
  ]);
  res.json({ total, recent, averageRating: avg[0] ? Number(avg[0].avg.toFixed(1)) : 0 });
}));

// Find by ID
app.get('/api/restaurants/:id', wrap(async (req, res) => {
  const doc = await restaurants.findOne({ restaurant_id: parseId(req.params.id) });
  if (!doc) return res.status(404).json({ error: 'Restaurant not found' });
  res.json(doc);
}));

// Create
app.post('/api/restaurants', wrap(async (req, res) => {
  const data = validateRestaurant(req.body);
  const now = new Date();
  const doc = { ...data, restaurant_id: await nextId(), createdAt: now, updatedAt: now };
  await restaurants.insertOne(doc);
  res.status(201).json(doc);
}));

// Update
app.put('/api/restaurants/:id', wrap(async (req, res) => {
  const data = validateRestaurant(req.body);
  const doc = await restaurants.findOneAndUpdate(
    { restaurant_id: parseId(req.params.id) },
    { $set: { ...data, updatedAt: new Date() } },
    { returnDocument: 'after' }
  );
  if (!doc) return res.status(404).json({ error: 'Restaurant not found' });
  res.json(doc);
}));

// Delete
app.delete('/api/restaurants/:id', wrap(async (req, res) => {
  const doc = await restaurants.findOneAndDelete({ restaurant_id: parseId(req.params.id) });
  if (!doc) return res.status(404).json({ error: 'Restaurant not found' });
  res.status(204).end();
}));

app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

// Error handler (validation, bad input)
app.use((err, req, res, next) => {
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.details[0], details: err.details });
  }
  if (err.name === 'CastError') return res.status(400).json({ error: 'Invalid value provided' });
  if (err.code === 11000) return res.status(409).json({ error: 'Duplicate record, please try again' });
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server' });
});

client
  .connect()
  .then(async () => {
    const db = client.db(DB_NAME);
    restaurants = db.collection('restaurants');
    await restaurants.createIndex({ restaurant_id: 1 }, { unique: true });
    console.log(`MongoDB connected: ${db.databaseName}`);
    app.listen(PORT, () => console.log(`ABCJ Finds running at http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  });
