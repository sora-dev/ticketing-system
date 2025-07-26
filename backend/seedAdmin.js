const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

const createDefaultAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ticketing-system');
    
    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: process.env.DEFAULT_ADMIN_EMAIL || 'admin@ticketing.com' });
    
    if (existingAdmin) {
      console.log('Default admin already exists');
      process.exit(0);
    }
    
    // Create default admin
    const admin = new User({
      name: 'System Administrator',
      email: process.env.DEFAULT_ADMIN_EMAIL || 'admin@ticketing.com',
      password: process.env.DEFAULT_ADMIN_PASSWORD || 'admin123',
      role: 'admin',
      department: 'IT'
    });
    
    await admin.save();
    console.log('Default admin created successfully!');
    console.log('Email:', process.env.DEFAULT_ADMIN_EMAIL || 'admin@ticketing.com');
    console.log('Password:', process.env.DEFAULT_ADMIN_PASSWORD || 'admin123');
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating default admin:', error);
    process.exit(1);
  }
};

createDefaultAdmin();