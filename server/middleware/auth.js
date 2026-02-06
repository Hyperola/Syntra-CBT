const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      console.log('Auth middleware - No token provided', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path
      });
      return res.status(401).json({ 
        error: 'Access denied. No authentication token provided.',
        code: 'NO_TOKEN'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key');
    
    // Check if user still exists and is active
    const user = await User.findById(decoded.id)
      .select('-password')
      .populate('permissions', 'name description')
      .lean();

    if (!user) {
      console.log('Auth middleware - User not found', {
        userId: decoded.id,
        tokenIssuedAt: new Date(decoded.iat * 1000)
      });
      return res.status(401).json({ 
        error: 'User account no longer exists.',
        code: 'USER_NOT_FOUND'
      });
    }

    if (!user.active) {
      console.log('Auth middleware - User account inactive', {
        userId: user._id,
        username: user.username
      });
      return res.status(401).json({ 
        error: 'Account has been deactivated. Please contact administrator.',
        code: 'ACCOUNT_INACTIVE'
      });
    }

    if (user.blocked) {
      console.log('Auth middleware - User account blocked', {
        userId: user._id,
        username: user.username
      });
      return res.status(401).json({ 
        error: 'Account has been blocked. Please contact administrator.',
        code: 'ACCOUNT_BLOCKED'
      });
    }

    // NEW: Enhanced super_admin validation - REMOVED EXTRA VALIDATION
    if (user.role === 'super_admin') {
      console.log('Auth middleware - Super admin access detected', {
        userId: user._id,
        username: user.username,
        ip: req.ip
      });
      
      // Trust the JWT verification and user lookup - no extra validation needed
      // Super admin role is already verified by the token and user lookup above
    }

    // Add user to request object with enhanced information
    req.user = {
      id: user._id,
      userId: user._id, // Maintain compatibility
      username: user.username,
      email: user.email,
      name: user.name,
      surname: user.surname,
      role: user.role,
      studentId: user.studentId,
      class: user.class,
      subjects: user.subjects,
      enrolledSubjects: user.enrolledSubjects,
      permissions: user.permissions || [],
      adminPermissions: user.adminPermissions || [], // NEW: Include admin permissions
      lastLogin: user.lastLogin,
      isLocked: user.isLocked || false,
      // Parent-specific fields (if applicable)
      children: user.children || [],
      phoneNumber: user.phoneNumber,
      address: user.address,
      occupation: user.occupation
    };

    console.log('Auth middleware - Authentication successful', {
      userId: user._id,
      username: user.username,
      role: user.role,
      permissions: user.permissions?.length || 0,
      adminPermissions: user.adminPermissions?.length || 0, // NEW: Log admin permissions
      childrenCount: user.children?.length || 0, // NEW: Log children count for parents
      ip: req.ip,
      path: req.path
    });

    next();
  } catch (error) {
    console.error('Auth middleware - Token verification failed', {
      error: error.message,
      token: req.header('Authorization') ? 'Present' : 'Missing',
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Invalid authentication token.',
        code: 'INVALID_TOKEN'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Authentication token has expired.',
        code: 'TOKEN_EXPIRED'
      });
    }

    res.status(500).json({ 
      error: 'Authentication failed due to server error.',
      code: 'AUTH_SERVER_ERROR'
    });
  }
};

// Role-based middleware with enhanced logging and validation
const createRoleMiddleware = (allowedRoles, middlewareName) => {
  return (req, res, next) => {
    const userRole = req.user?.role;
    
    console.log(`Role middleware (${middlewareName}) - Checking access`, {
      userId: req.user?.id,
      username: req.user?.username,
      userRole: userRole,
      allowedRoles: allowedRoles,
      path: req.path,
      method: req.method
    });

    if (!req.user) {
      console.error(`Role middleware (${middlewareName}) - No user in request`);
      return res.status(401).json({ 
        error: 'Authentication required.',
        code: 'AUTH_REQUIRED'
      });
    }

    const roleArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    
    // NEW: Enhanced super_admin access - super_admin bypasses all role checks
    if (userRole === 'super_admin') {
      console.log(`Role middleware (${middlewareName}) - Super admin bypass`, {
        userId: req.user.id,
        username: req.user.username
      });
      return next();
    }
    
    if (!roleArray.includes(userRole)) {
      console.warn(`Role middleware (${middlewareName}) - Access denied`, {
        userId: req.user.id,
        username: req.user.username,
        userRole: userRole,
        requiredRoles: roleArray,
        path: req.path
      });

      const roleNames = roleArray.map(role => 
        role.split('_').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ')
      );

      return res.status(403).json({ 
        error: `Access restricted to ${roleNames.join(' or ')} only.`,
        code: 'ROLE_ACCESS_DENIED',
        requiredRoles: roleArray,
        userRole: userRole
      });
    }

    console.log(`Role middleware (${middlewareName}) - Access granted`, {
      userId: req.user.id,
      username: req.user.username,
      role: userRole
    });

    next();
  };
};

// Specific role middlewares
const superAdminOnly = createRoleMiddleware('super_admin', 'SuperAdminOnly');
const adminOnly = createRoleMiddleware('admin', 'AdminOnly');
const teacherOnly = createRoleMiddleware('teacher', 'TeacherOnly');
const studentOnly = createRoleMiddleware('student', 'StudentOnly');
const parentOnly = createRoleMiddleware('parent', 'ParentOnly');

// Combined role middlewares
const adminOrTeacher = createRoleMiddleware(['admin', 'teacher'], 'AdminOrTeacher');
const teacherOrStudent = createRoleMiddleware(['teacher', 'student'], 'TeacherOrStudent');
const adminOrSuperAdmin = createRoleMiddleware(['admin', 'super_admin'], 'AdminOrSuperAdmin');
const adminOrParent = createRoleMiddleware(['admin', 'parent'], 'AdminOrParent');
const teacherOrParent = createRoleMiddleware(['teacher', 'parent'], 'TeacherOrParent');
const parentOrStudent = createRoleMiddleware(['parent', 'student'], 'ParentOrStudent');

// NEW: Admin with specific permission middleware
const adminWithPermission = (permissionName) => {
  return (req, res, next) => {
    console.log('Admin permission middleware - Checking:', {
      userId: req.user?.id,
      username: req.user?.username,
      role: req.user?.role,
      permission: permissionName,
      adminPermissions: req.user?.adminPermissions
    });

    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required.',
        code: 'AUTH_REQUIRED'
      });
    }

    // Super admin bypasses all permission checks
    if (req.user.role === 'super_admin') {
      console.log('Admin permission middleware - Super admin bypass', {
        userId: req.user.id,
        username: req.user.username
      });
      return next();
    }

    // Check if user is admin and has the specific permission
    if (req.user.role !== 'admin') {
      console.warn('Admin permission middleware - Not an admin', {
        userId: req.user.id,
        username: req.user.username,
        role: req.user.role
      });
      return res.status(403).json({ 
        error: 'Admin access required.',
        code: 'ADMIN_ACCESS_REQUIRED'
      });
    }

    if (!req.user.adminPermissions || !req.user.adminPermissions.includes(permissionName)) {
      console.warn('Admin permission middleware - Permission denied', {
        userId: req.user.id,
        username: req.user.username,
        requiredPermission: permissionName,
        userPermissions: req.user.adminPermissions
      });
      return res.status(403).json({ 
        error: `Admin permission '${permissionName}' required.`,
        code: 'ADMIN_PERMISSION_DENIED',
        requiredPermission: permissionName
      });
    }

    console.log('Admin permission middleware - Access granted', {
      userId: req.user.id,
      username: req.user.username,
      permission: permissionName
    });

    next();
  };
};

// Parent-only middleware (already exists - defined above)
// const parentOnly = createRoleMiddleware('parent', 'ParentOnly');

// Parent access to student middleware (NEW - comprehensive version)
const parentAccessToStudent = async (req, res, next) => {
  try {
    console.log('Parent access to student middleware - Checking:', {
      userId: req.user?.id,
      username: req.user?.username,
      studentId: req.params.studentId || req.body.studentId
    });

    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required.',
        code: 'AUTH_REQUIRED'
      });
    }

    const studentId = req.params.studentId || req.body.studentId;
    
    if (!studentId) {
      console.warn('Parent access to student - No student ID provided');
      return res.status(400).json({ 
        error: 'Student ID is required.',
        code: 'STUDENT_ID_REQUIRED'
      });
    }

    // Super admin and admin bypass (for admin endpoints)
    if (req.user.role === 'super_admin' || req.user.role === 'admin') {
      console.log('Parent access to student - Admin bypass', {
        userId: req.user.id,
        username: req.user.username
      });
      return next();
    }

    // Check if user is parent
    if (req.user.role !== 'parent') {
      console.warn('Parent access to student - Not a parent', {
        userId: req.user.id,
        username: req.user.username,
        role: req.user.role
      });
      return res.status(403).json({ 
        error: 'Parent access required.',
        code: 'PARENT_ACCESS_REQUIRED'
      });
    }

    // Fetch fresh parent data to ensure we have current children list
    const parent = await User.findById(req.user.id).select('children').lean();
    
    if (!parent.children || parent.children.length === 0) {
      console.warn('Parent access to student - No children assigned', {
        userId: req.user.id,
        username: req.user.username
      });
      return res.status(403).json({ 
        error: 'No children assigned to your account.',
        code: 'NO_CHILDREN_ASSIGNED'
      });
    }

    // Check if parent has access to this student
    const hasAccess = parent.children.some(child => 
      child.toString() === studentId.toString()
    );

    if (!hasAccess) {
      console.warn('Parent access to student - Access denied', {
        userId: req.user.id,
        username: req.user.username,
        requestedStudent: studentId,
        parentChildren: parent.children
      });
      return res.status(403).json({ 
        error: 'You do not have access to this student.',
        code: 'STUDENT_ACCESS_DENIED'
      });
    }

    // Verify student exists and is active
    const student = await User.findOne({
      _id: studentId,
      role: 'student',
      active: true
    }).select('_id firstName lastName studentId').lean();

    if (!student) {
      console.warn('Parent access to student - Student not found or inactive', {
        studentId: studentId
      });
      return res.status(404).json({ 
        error: 'Student not found or inactive.',
        code: 'STUDENT_NOT_FOUND'
      });
    }

    // Store student info in request for later use
    req.studentInfo = student;
    req.studentId = studentId;

    console.log('Parent access to student - Access granted', {
      userId: req.user.id,
      username: req.user.username,
      studentId: studentId,
      studentName: `${student.firstName} ${student.lastName}`
    });

    next();
  } catch (error) {
    console.error('Parent access to student - Error:', {
      error: error.message,
      userId: req.user?.id
    });
    res.status(500).json({ 
      error: 'Server error while checking parent access.',
      code: 'PARENT_ACCESS_ERROR'
    });
  }
};

// NEW: Parent-specific validation middleware
const validateParentChildAccess = (req, res, next) => {
  if (req.user.role !== 'parent') {
    return next();
  }

  const childId = req.params.studentId || req.body.studentId || req.query.studentId;
  
  if (!childId) {
    console.warn('Parent child access validation - No child ID provided', {
      userId: req.user.id,
      username: req.user.username,
      path: req.path
    });
    
    // If no child ID is specified, allow access but note that parent can only see their children
    return next();
  }

  // Check if the requested child is in the parent's children list
  const hasAccess = req.user.children?.some(child => 
    child.toString() === childId.toString()
  );

  if (!hasAccess) {
    console.warn('Parent child access validation - Attempt to access non-child student', {
      userId: req.user.id,
      username: req.user.username,
      attemptedAccess: childId,
      parentChildren: req.user.children || []
    });

    return res.status(403).json({ 
      error: 'You can only access data for your own children.',
      code: 'PARENT_CHILD_ACCESS_DENIED'
    });
  }

  console.log('Parent child access validation - Access granted', {
    userId: req.user.id,
    username: req.user.username,
    childId: childId
  });

  next();
};

// NEW: Parent or self-access validation
const validateParentOrStudentAccess = (req, res, next) => {
  const studentId = req.params.studentId || req.body.studentId || req.query.studentId;
  
  if (!studentId) {
    return next();
  }

  // If user is student, can only access own data
  if (req.user.role === 'student') {
    if (studentId.toString() !== req.user.id.toString()) {
      return res.status(403).json({ 
        error: 'You can only access your own data.',
        code: 'SELF_ACCESS_ONLY'
      });
    }
    return next();
  }

  // If user is parent, can only access children's data
  if (req.user.role === 'parent') {
    const hasAccess = req.user.children?.some(child => 
      child.toString() === studentId.toString()
    );

    if (!hasAccess) {
      return res.status(403).json({ 
        error: 'You can only access data for your own children.',
        code: 'PARENT_CHILD_ACCESS_DENIED'
      });
    }
    return next();
  }

  // Admin, teacher, and super_admin have full access
  next();
};

// Subject assignment validation middleware
const validateTeacherSubject = (req, res, next) => {
  if (req.user.role !== 'teacher') {
    return next();
  }

  const { subject, class: classId } = req.body;
  
  if (!subject || !classId) {
    return next();
  }

  const hasAccess = req.user.subjects?.some(sub => 
    sub.subject === subject && sub.class.toString() === classId.toString()
  );

  if (!hasAccess) {
    console.warn('Subject validation - Teacher not assigned to subject/class', {
      userId: req.user.id,
      username: req.user.username,
      requestedSubject: subject,
      requestedClass: classId,
      assignedSubjects: req.user.subjects
    });

    return res.status(403).json({ 
      error: 'You are not assigned to teach this subject in the specified class.',
      code: 'SUBJECT_ACCESS_DENIED'
    });
  }

  next();
};

// Class assignment validation middleware
const validateTeacherClass = (req, res, next) => {
  if (req.user.role !== 'teacher') {
    return next();
  }

  const classId = req.params.classId || req.body.class;
  
  if (!classId) {
    return next();
  }

  const hasAccess = req.user.subjects?.some(sub => 
    sub.class.toString() === classId.toString()
  );

  if (!hasAccess) {
    console.warn('Class validation - Teacher not assigned to class', {
      userId: req.user.id,
      username: req.user.username,
      requestedClass: classId,
      assignedClasses: req.user.subjects?.map(sub => sub.class) || []
    });

    return res.status(403).json({ 
      error: 'You are not assigned to teach in this class.',
      code: 'CLASS_ACCESS_DENIED'
    });
  }

  next();
};

// Student self-access validation
const validateStudentAccess = (req, res, next) => {
  if (req.user.role !== 'student') {
    return next();
  }

  const studentId = req.params.studentId || req.body.studentId;
  
  if (studentId && studentId !== req.user.id.toString()) {
    console.warn('Student access validation - Attempt to access other student data', {
      userId: req.user.id,
      username: req.user.username,
      attemptedAccess: studentId
    });

    return res.status(403).json({ 
      error: 'You can only access your own data.',
      code: 'SELF_ACCESS_ONLY'
    });
  }

  next();
};

module.exports = {
  auth,
  superAdminOnly,
  adminOnly,
  teacherOnly,
  studentOnly,
  parentOnly,
  adminOrTeacher,
  teacherOrStudent,
  adminOrSuperAdmin,
  adminOrParent,
  teacherOrParent,
  parentOrStudent,
  adminWithPermission,
  validateTeacherSubject,
  validateTeacherClass,
  validateStudentAccess,
  validateParentChildAccess,
  validateParentOrStudentAccess,
  parentAccessToStudent, // NEW: Export the comprehensive parent access middleware
  createRoleMiddleware
};