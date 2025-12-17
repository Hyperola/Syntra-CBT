// fixPasswords.js - Run this to fix all user passwords
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/school-management', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const User = require('./models/User');

const fixUserPasswords = async () => {
  try {
    console.log('🔧 Fixing user passwords...');
    
    // Get all users
    const users = await User.find({});
    console.log(`📋 Found ${users.length} users in database`);
    
    // Default password to use
    const defaultPassword = 'admin123';
    
    for (const user of users) {
      console.log(`\n👤 Processing user: ${user.username} (${user.role})`);
      
      // Hash the default password
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);
      
      // Update the user's password
      user.password = hashedPassword;
      user.active = true;
      user.blocked = false;
      user.loginAttempts = 0;
      user.lockUntil = undefined;
      
      await user.save();
      console.log(`✅ Updated password for ${user.username} to: ${defaultPassword}`);
    }
    
    console.log('\n🎉 ALL PASSWORDS HAVE BEEN RESET!');
    console.log('====================================');
    console.log('Use these credentials to login:');
    console.log('------------------------------------');
    
    users.forEach(user => {
      console.log(`${user.username} (${user.role}) -> Password: ${defaultPassword}`);
    });
    
    console.log('====================================');
    
    await mongoose.disconnect();
    
  } catch (error) {
    console.error('❌ Error fixing passwords:', error);
    process.exit(1);
  }
};

fixUserPasswords();