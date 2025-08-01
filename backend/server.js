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
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/tickets', require('./routes/tickets'));
app.use('/api/users', require('./routes/users'));
app.use('/api/knowledge-base', require('./routes/knowledgeBase'));
app.use('/api/audit', require('./routes/audit'));
app.use('/api/system-config', systemConfigRoutes);
app.use('/api/backup', require('./routes/backup')); // Add this line

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ticketing-system')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});