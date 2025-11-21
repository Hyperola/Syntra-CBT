const express = require('express');
const router = express.Router();
const Permission = require('../models/Permission');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

// Admin route to fix permissions
router.post('/admin/fix-permissions', auth, async (req, res) => {
  try {
    // Only allow admins
    if (!['admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    console.log(`🔧 Manual permission fix requested by: ${req.user.username}`);
    
    const result = await Permission.fixMissingPermissions(req.user.userId);
    
    if (result.fixed) {
      res.json({
        success: true,
        message: `Fixed ${result.added.length} missing permissions`,
        added: result.added,
        timestamp: new Date().toISOString()
      });
    } else {
      res.json({
        success: true,
        message: 'No missing permissions found',
        added: [],
        timestamp: new Date().toISOString()
      });
    }
    
  } catch (error) {
    console.error('Permission fix error:', error);
    res.status(500).json({ 
      error: 'Failed to fix permissions',
      details: error.message 
    });
  }
});

// Admin route to seed all permissions
router.post('/admin/seed-permissions', auth, async (req, res) => {
  try {
    if (!['admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    console.log(`🌱 Manual permission seed requested by: ${req.user.username}`);
    
    const result = await Permission.seedDefaultPermissions(req.user.userId);
    
    res.json({
      success: true,
      message: `Permissions seeded successfully`,
      added: result.added,
      existing: result.existing,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Permission seed error:', error);
    res.status(500).json({ 
      error: 'Failed to seed permissions',
      details: error.message 
    });
  }
});

// Admin route to check permission status
router.get('/admin/permission-status', auth, async (req, res) => {
  try {
    if (!['admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const requiredPermissions = ['VIEW_QUESTIONS', 'VIEW_TESTS', 'VIEW_RESULTS'];
    const status = {};
    
    for (const permName of requiredPermissions) {
      const exists = await Permission.findOne({ name: permName });
      status[permName] = {
        exists: !!exists,
        description: exists ? exists.description : 'MISSING'
      };
    }
    
    const allExist = requiredPermissions.every(perm => status[perm].exists);
    
    res.json({
      success: true,
      allPermissionsExist: allExist,
      permissions: status,
      health: allExist ? 'HEALTHY' : 'MISSING_PERMISSIONS',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Permission status check error:', error);
    res.status(500).json({ 
      error: 'Failed to check permission status',
      details: error.message 
    });
  }
});

module.exports = router;