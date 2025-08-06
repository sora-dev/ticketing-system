const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const systemConfigRoutes = require('./routes/systemConfig');

const app = express();

// Trust proxy to get real IP addresses
app.set('trust proxy', true);

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/tickets', require('./routes/tickets'));
app.use('/api/users', require('./routes/users'));
app.use('/api/knowledge-base', require('./routes/knowledgeBase'));
app.use('/api/audit', require('./routes/audit'));
app.use('/api/system-config', systemConfigRoutes);
app.use('/api/backup', require('./routes/backup')); // Add this line
app.use('/api/debug', require('./routes/debug')); // Debug route

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ticketing-system')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

const PORT = process.env.PORT || 5001;
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
  console.log(`Access from other computers using your machine's IP address`);
});