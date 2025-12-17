// fix-all.js - RUN THIS TO FIX ALL ISSUES
const mongoose = require('mongoose');
require('dotenv').config();

async function fixAllIssues() {
  console.log('🔧 Starting comprehensive fix script...');
  
  try {
    // Connect with better settings
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/waec-cbt', {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 30000,
      maxPoolSize: 10,
    });
    
    console.log('✅ Connected to MongoDB');
    
    const db = mongoose.connection.db;
    const User = require('./models/User');
    
    // 1. Fix missing surnames
    console.log('\n1️⃣ Fixing users without surname...');
    const result = await db.collection('users').updateMany(
      { 
        $or: [
          { surname: { $exists: false } },
          { surname: null },
          { surname: "" }
        ]
      },
      [
        {
          $set: {
            surname: {
              $cond: {
                if: { $and: [{ $ne: ["$name", null] }, { $ne: ["$name", ""] }] },
                then: "$name",
                else: "User"
              }
            },
            name: {
              $cond: {
                if: { $and: [{ $ne: ["$name", null] }, { $ne: ["$name", ""] }] },
                then: "$name",
                else: "User"
              }
            }
          }
        }
      ]
    );
    
    console.log(`✅ Fixed ${result.modifiedCount} users with missing surname`);
    
    // 2. Clean up duplicate indexes
    console.log('\n2️⃣ Checking for duplicate indexes...');
    const indexes = await db.collection('users').indexes();
    
    console.log(`📊 Found ${indexes.length} indexes total:`);
    indexes.forEach((index, i) => {
      console.log(`   ${i + 1}. ${JSON.stringify(index.key)}`);
    });
    
    // Find and remove duplicate indexes
    const seen = new Set();
    const duplicates = [];
    
    for (const index of indexes) {
      const keyStr = JSON.stringify(index.key);
      if (seen.has(keyStr)) {
        duplicates.push(index.name);
      } else {
        seen.add(keyStr);
      }
    }
    
    if (duplicates.length > 0) {
      console.log(`⚠️ Found ${duplicates.length} duplicate indexes to remove:`);
      for (const dup of duplicates) {
        console.log(`   • ${dup}`);
        try {
          await db.collection('users').dropIndex(dup);
          console.log(`     ✅ Removed duplicate index: ${dup}`);
        } catch (err) {
          console.log(`     ⚠️ Could not remove index ${dup}: ${err.message}`);
        }
      }
    } else {
      console.log('✅ No duplicate indexes found');
    }
    
    // 3. Create optimized indexes
    console.log('\n3️⃣ Creating optimized indexes...');
    
    // Drop and recreate indexes properly
    try {
      // Drop all non-_id indexes
      const currentIndexes = await db.collection('users').indexes();
      for (const index of currentIndexes) {
        if (index.name !== '_id_') {
          try {
            await db.collection('users').dropIndex(index.name);
            console.log(`   • Dropped index: ${index.name}`);
          } catch (err) {
            // Ignore errors for non-existent indexes
          }
        }
      }
      
      // Create optimized indexes
      const indexesToCreate = [
        { key: { role: 1, active: 1 } },
        { key: { adminPermissions: 1 } },
        { key: { className: 1 } },
        { key: { 'subjects.className': 1 } },
        { key: { 'subjects.class': 1 } },
        { key: { 'subjects.subject': 1 } },
        { key: { 'enrolledSubjects.class': 1 } },
        { key: { 'enrolledSubjects.subject': 1 } }
      ];
      
      for (const indexDef of indexesToCreate) {
        await db.collection('users').createIndex(indexDef.key);
        console.log(`   ✅ Created index: ${JSON.stringify(indexDef.key)}`);
      }
      
      console.log('✅ All indexes recreated successfully');
      
    } catch (indexError) {
      console.log('⚠️ Could not recreate indexes:', indexError.message);
    }
    
    // 4. Verify fixes
    console.log('\n4️⃣ Verifying fixes...');
    
    // Check for users still without surname
    const usersWithoutSurname = await db.collection('users').countDocuments({
      $or: [
        { surname: { $exists: false } },
        { surname: null },
        { surname: "" }
      ]
    });
    
    console.log(`📊 Users still without surname: ${usersWithoutSurname}`);
    
    // Check total users
    const totalUsers = await db.collection('users').countDocuments();
    console.log(`📊 Total users in database: ${totalUsers}`);
    
    console.log('\n🎉 Fix script completed successfully!');
    
  } catch (error) {
    console.error('❌ Error in fix script:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    // Close connection
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      console.log('🔌 Disconnected from MongoDB');
    }
    process.exit(0);
  }
}

// Run the fix
fixAllIssues();