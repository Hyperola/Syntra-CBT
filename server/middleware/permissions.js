const Permission = require('../models/Permission');

// Cache for permissions to reduce database queries
const permissionCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Clear permission cache
const clearPermissionCache = () => {
  permissionCache.clear();
  console.log('Permission cache cleared');
};

// Get permission from cache or database
const getPermission = async (permissionName) => {
  const cached = permissionCache.get(permissionName);
 
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.permission;
  }

  const permission = await Permission.findOne({
    name: permissionName,
    isActive: true
  });

  if (permission) {
    permissionCache.set(permissionName, {
      permission,
      timestamp: Date.now()
    });
  }

  return permission;
};

// SIMPLIFIED: Middleware to check if user has specific permission
const checkPermission = (permissionName) => {
  return async (req, res, next) => {
    try {
      console.log('🔐 Permission check starting:', {
        permission: permissionName,
        userId: req.user?.id,
        username: req.user?.username,
        userRole: req.user?.role,
        path: req.path,
        method: req.method
      });

      // 1. Check if user exists
      if (!req.user) {
        console.warn('❌ No user in request');
        return res.status(401).json({
          success: false,
          message: 'Authentication required.'
        });
      }

      // 2. Super admin bypasses all checks
      if (req.user.role === 'super_admin') {
        console.log('✅ Super admin - permission granted');
        return next();
      }

      // 3. For teachers creating tests, use special handling
      if (req.user.role === 'teacher' && permissionName === 'create_test') {
        console.log('👨‍🏫 Teacher creating test - checking assignments');
        
        // Teachers can create tests if they have subjects assigned
        if (req.user.subjects && req.user.subjects.length > 0) {
          console.log('✅ Teacher has subjects assigned - allowing test creation');
          return next();
        } else {
          console.warn('❌ Teacher has no subjects assigned');
          return res.status(403).json({
            success: false,
            message: 'Access denied. You need to be assigned to subjects to create tests.'
          });
        }
      }

      // 4. Get user permissions based on role
      let userPermissions = [];
      
      if (req.user.role === 'admin') {
        // Admins have both permissions and adminPermissions
        const regularPerms = req.user.permissions || [];
        const adminPerms = req.user.adminPermissions || [];
        
        // Convert all to permission names
        userPermissions = [
          ...regularPerms.map(p => typeof p === 'object' ? p.name : p),
          ...adminPerms.map(p => typeof p === 'object' ? p.name : p)
        ];
        
        // Admins with 'all' permission can do anything
        if (adminPerms.includes('all')) {
          console.log('✅ Admin with "all" permission - access granted');
          return next();
        }
        
      } else if (req.user.role === 'teacher') {
        // Teacher permissions - including create_test
        const teacherPermissions = [
          'view_tests',
          'create_test',  // Teachers can create tests
          'update_test',  // Teachers can update their tests
          'view_results',
          'view_students',
          'view_assignments',
          'manage_questions'
        ];
        
        const regularPerms = req.user.permissions || [];
        userPermissions = [
          ...regularPerms.map(p => typeof p === 'object' ? p.name : p),
          ...teacherPermissions
        ];
        
        console.log('📋 Teacher permissions:', userPermissions);
        
      } else if (req.user.role === 'student') {
        // Students only have permissions (NOT adminPermissions)
        const regularPerms = req.user.permissions || [];
        userPermissions = regularPerms.map(p => typeof p === 'object' ? p.name : p);
      }

      console.log('📋 User permissions check:', {
        permission: permissionName,
        userRole: req.user.role,
        userPermissions: userPermissions
      });

      // 5. Check if user has the permission
      if (!userPermissions.includes(permissionName)) {
        console.warn('❌ Permission denied:', permissionName);
        return res.status(403).json({
          success: false,
          message: `Access denied. Required permission: ${permissionName}`,
          requiredPermission: permissionName,
          userRole: req.user.role,
          userPermissions: userPermissions
        });
      }

      console.log('✅ Permission granted:', permissionName);
      next();

    } catch (error) {
      console.error('💥 Permission check error:', {
        error: error.message,
        permission: permissionName,
        userId: req.user?.id,
        stack: error.stack
      });
      res.status(500).json({
        success: false,
        message: 'Server error during permission check.'
      });
    }
  };
};

// Middleware for teacher-only access (without specific permission)
const teacherOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.'
    });
  }

  if (req.user.role !== 'teacher') {
    console.warn('❌ Teacher access denied:', {
      userId: req.user.id,
      userRole: req.user.role
    });
    return res.status(403).json({
      success: false,
      message: 'Teacher access required.'
    });
  }

  console.log('✅ Teacher access granted:', {
    userId: req.user.id,
    username: req.user.username
  });
  next();
};

// SIMPLIFIED: Middleware to check if user has any of the provided permissions
const checkAnyPermission = (permissionNames) => {
  return async (req, res, next) => {
    try {
      console.log('🔐 AnyPermission check starting:', {
        permissions: permissionNames,
        userId: req.user?.id,
        userRole: req.user?.role,
        path: req.path
      });

      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required.'
        });
      }

      // Super admin bypass
      if (req.user.role === 'super_admin') {
        console.log('✅ Super admin - any permission granted');
        return next();
      }

      // Special handling for teachers creating tests
      if (req.user.role === 'teacher' && permissionNames.includes('create_test')) {
        if (req.user.subjects && req.user.subjects.length > 0) {
          console.log('✅ Teacher has subjects - allowing action');
          return next();
        }
      }

      // Get user permissions based on role
      let userPermissions = [];
      
      if (req.user.role === 'admin') {
        const regularPerms = req.user.permissions || [];
        const adminPerms = req.user.adminPermissions || [];
        userPermissions = [
          ...regularPerms.map(p => typeof p === 'object' ? p.name : p),
          ...adminPerms.map(p => typeof p === 'object' ? p.name : p)
        ];
        
        if (adminPerms.includes('all')) {
          return next();
        }
        
      } else if (req.user.role === 'teacher') {
        const teacherPermissions = [
          'view_tests',
          'create_test',
          'update_test',
          'view_results',
          'view_students',
          'view_assignments',
          'manage_questions'
        ];
        
        const regularPerms = req.user.permissions || [];
        userPermissions = [
          ...regularPerms.map(p => typeof p === 'object' ? p.name : p),
          ...teacherPermissions
        ];
        
      } else if (req.user.role === 'student') {
        const regularPerms = req.user.permissions || [];
        userPermissions = regularPerms.map(p => typeof p === 'object' ? p.name : p);
      }

      // Check if user has any of the required permissions
      const hasAnyPermission = permissionNames.some(permissionName => 
        userPermissions.includes(permissionName)
      );

      if (!hasAnyPermission) {
        console.warn('❌ No required permissions found');
        return res.status(403).json({
          success: false,
          message: 'Access denied. Insufficient permissions.',
          requiredPermissions: permissionNames,
          userPermissions: userPermissions,
          userRole: req.user.role
        });
      }

      console.log('✅ AnyPermission granted for one of:', permissionNames);
      next();

    } catch (error) {
      console.error('💥 AnyPermission check error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Server error during permission check.'
      });
    }
  };
};

// SIMPLIFIED: Middleware to check if user has all of the provided permissions
const checkAllPermissions = (permissionNames) => {
  return async (req, res, next) => {
    try {
      console.log('🔐 AllPermissions check starting:', {
        permissions: permissionNames,
        userId: req.user?.id,
        userRole: req.user?.role
      });

      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required.'
        });
      }

      // Super admin bypass
      if (req.user.role === 'super_admin') {
        console.log('✅ Super admin - all permissions granted');
        return next();
      }

      // Get user permissions based on role
      let userPermissions = [];
      
      if (req.user.role === 'admin') {
        const regularPerms = req.user.permissions || [];
        const adminPerms = req.user.adminPermissions || [];
        userPermissions = [
          ...regularPerms.map(p => typeof p === 'object' ? p.name : p),
          ...adminPerms.map(p => typeof p === 'object' ? p.name : p)
        ];
        
        if (adminPerms.includes('all')) {
          return next();
        }
        
      } else if (req.user.role === 'teacher') {
        const teacherPermissions = [
          'view_tests',
          'create_test',
          'update_test',
          'view_results',
          'view_students',
          'view_assignments',
          'manage_questions'
        ];
        
        const regularPerms = req.user.permissions || [];
        userPermissions = [
          ...regularPerms.map(p => typeof p === 'object' ? p.name : p),
          ...teacherPermissions
        ];
        
      } else if (req.user.role === 'student') {
        const regularPerms = req.user.permissions || [];
        userPermissions = regularPerms.map(p => typeof p === 'object' ? p.name : p);
      }

      // Check if user has ALL required permissions
      const hasAllPermissions = permissionNames.every(permissionName => 
        userPermissions.includes(permissionName)
      );

      if (!hasAllPermissions) {
        const missingPermissions = permissionNames.filter(permissionName => 
          !userPermissions.includes(permissionName)
        );
        
        console.warn('❌ Missing permissions:', missingPermissions);
        return res.status(403).json({
          success: false,
          message: 'Access denied. Missing some permissions.',
          missingPermissions,
          requiredPermissions: permissionNames,
          userPermissions: userPermissions,
          userRole: req.user.role
        });
      }

      console.log('✅ AllPermissions granted for:', permissionNames);
      next();

    } catch (error) {
      console.error('💥 AllPermissions check error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Server error during permission check.'
      });
    }
  };
};

// Debug endpoint to check user permissions
const checkUserPermissions = async (req, res) => {
  try {
    const permissionName = req.query.permission || 'view_users';
    
    // Get user permissions based on role
    let userPermissions = [];
    
    if (req.user.role === 'admin') {
      const regularPerms = req.user.permissions || [];
      const adminPerms = req.user.adminPermissions || [];
      userPermissions = [
        ...regularPerms.map(p => typeof p === 'object' ? p.name : p),
        ...adminPerms.map(p => typeof p === 'object' ? p.name : p)
      ];
      
    } else if (req.user.role === 'teacher') {
      const teacherPermissions = [
        'view_tests',
        'create_test',
        'update_test',
        'view_results',
        'view_students',
        'view_assignments',
        'manage_questions'
      ];
      
      const regularPerms = req.user.permissions || [];
      userPermissions = [
        ...regularPerms.map(p => typeof p === 'object' ? p.name : p),
        ...teacherPermissions
      ];
      
    } else if (req.user.role === 'student') {
      const regularPerms = req.user.permissions || [];
      userPermissions = regularPerms.map(p => typeof p === 'object' ? p.name : p);
    }

    const hasPermission = 
      req.user.role === 'super_admin' ||
      userPermissions.includes(permissionName) ||
      (req.user.role === 'admin' && req.user.adminPermissions?.includes('all'));

    res.json({
      success: true,
      user: {
        id: req.user.id,
        username: req.user.username,
        role: req.user.role,
        subjects: req.user.subjects || []
      },
      permission: {
        name: permissionName,
        checked: hasPermission
      },
      userPermissions: userPermissions,
      hasPermission,
      checkResult: hasPermission ? 'GRANTED' : 'DENIED'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error checking permissions',
      error: error.message
    });
  }
};

module.exports = {
  checkPermission,
  teacherOnly,
  checkAnyPermission,
  checkAllPermissions,
  checkUserPermissions,
  clearPermissionCache,
  getPermission
};