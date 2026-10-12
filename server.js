require('dotenv').config();

const path = require('path');
const express = require('express');
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/dbRestaurants';
const PORT = process.env.PORT || 3000;

/* ---------- Model: dbRestaurants.restaurants ---------- */
const restaurantSchema = new mongoose.Schema(
  {
    restaurant_id: { type: Number, unique: true, index: true },
    name: { type: String, required: [true, 'Restaurant name is required'], trim: true, minlength: [2, 'Name must be at least 2 characters'], maxlength: [80, 'Name is too long'] },
    cuisine: { type: String, required: [true, 'Cuisine is required'], trim: true, maxlength: [40, 'Cuisine is too long'] },
    address: { type: String, required: [true, 'Location is required'], trim: true, maxlength: [120, 'Location is too long'] },
    rating: { type: Number, required: [true, 'Rating is required'], min: [0, 'Rating must be between 0 and 5'], max: [5, 'Rating must be between 0 and 5'] },
    contact: {
      type: String,
      required: [true, 'Contact number is required'],
      trim: true,
      match: [/^(09\d{9}|\+639\d{9})$/, 'Use a valid PH mobile number, e.g. 09171234567']
    }
  },
  { timestamps: true, collection: 'restaurants' }
);
const Restaurant = mongoose.model('Restaurant', restaurantSchema);

/* ---------- App ---------- */
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const pick = (b) => ({ name: b.name, cuisine: b.cuisine, address: b.address, rating: b.rating, contact: b.contact });

async function nextId() {
  const last = await Restaurant.findOne().sort({ restaurant_id: -1 }).select('restaurant_id').lean();
  return (last?.restaurant_id || 0) + 1;
}

// List + search / filter / sort
app.get('/api/restaurants', wrap(async (req, res) => {
  const { q, cuisine, location, sort } = req.query;
  const filter = {};
  if (q) {
    const rx = new RegExp(escapeRegex(String(q)), 'i');
    filter.$or = [{ name: rx }, { cuisine: rx }, { address: rx }];
  }
  if (cuisine) filter.cuisine = new RegExp(`^${escapeRegex(String(cuisine))}$`, 'i');
  if (location) filter.address = new RegExp(escapeRegex(String(location)), 'i');
  const sorts = {
    rating: { rating: -1, name: 1 },
    name: { name: 1 },
    recent: { updatedAt: -1 }
  };
  const items = await Restaurant.find(filter).sort(sorts[sort] || { restaurant_id: 1 }).lean();
  res.json(items);
}));

// Dashboard stats
app.get('/api/stats', wrap(async (req, res) => {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [total, recent, avg] = await Promise.all([
    Restaurant.countDocuments(),
    Restaurant.countDocuments({ updatedAt: { $gte: since } }),
    Restaurant.aggregate([{ $group: { _id: null, avg: { $avg: '$rating' } } }])
  ]);
  res.json({ total, recent, averageRating: avg[0] ? Number(avg[0].avg.toFixed(1)) : 0 });
}));

app.get('/api/restaurants/:id', wrap(async (req, res) => {
  const doc = await Restaurant.findOne({ restaurant_id: Number(req.params.id) }).lean();
  if (!doc) return res.status(404).json({ error: 'Restaurant not found' });
  res.json(doc);
}));

// Create
app.post('/api/restaurants', wrap(async (req, res) => {
  const doc = await Restaurant.create({ ...pick(req.body), restaurant_id: await nextId() });
  res.status(201).json(doc);
}));

// Update
app.put('/api/restaurants/:id', wrap(async (req, res) => {
  const doc = await Restaurant.findOneAndUpdate(
    { restaurant_id: Number(req.params.id) },
    pick(req.body),
    { new: true, runValidators: true }
  );
  if (!doc) return res.status(404).json({ error: 'Restaurant not found' });
  res.json(doc);
}));

// Delete
app.delete('/api/restaurants/:id', wrap(async (req, res) => {
  const doc = await Restaurant.findOneAndDelete({ restaurant_id: Number(req.params.id) });
  if (!doc) return res.status(404).json({ error: 'Restaurant not found' });
  res.status(204).end();
}));

app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

// Error handler (validation, bad input)
app.use((err, req, res, next) => {
  if (err.name === 'ValidationError') {
    const details = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ error: details[0], details });
  }
  if (err.name === 'CastError') return res.status(400).json({ error: 'Invalid value provided' });
  if (err.code === 11000) return res.status(409).json({ error: 'Duplicate record, please try again' });
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server' });
});

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log(`MongoDB connected: ${mongoose.connection.name} on ${mongoose.connection.host}`);
    app.listen(PORT, () => console.log(`ABCJ Finds running at http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  });
