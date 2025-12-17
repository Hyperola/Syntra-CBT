import React, { useState, useEffect, useRef, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { addStyles, EditableMathField } from 'react-mathquill';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { 
  FiSave, FiX, FiAlertTriangle, FiCheckCircle, FiHelpCircle, 
  FiPlus, FiMinus, FiBook, FiBookOpen, FiHash, FiType, FiUser, 
  FiLogIn, FiDivide, FiPercent, FiSquare, FiCode, FiGrid, FiTarget,
  FiActivity, FiThermometer, FiZap, FiWind, FiDroplet, FiSun, FiMoon
} from 'react-icons/fi';
import { AuthContext } from '../../context/AuthContext';

// Load MathQuill styles
addStyles();

// Configure axios base URL
axios.defaults.baseURL = 'http://localhost:5000';
axios.defaults.withCredentials = true;

const AddQuestion = () => {
  const { testId } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading, error: authError } = useContext(AuthContext);
  
  const [questionForms, setQuestionForms] = useState([
    {
      subject: '',
      class: '',
      text: [],
      options: ['', '', '', ''],
      correctAnswer: '',
      marks: 1,
      saveToBank: true,
      formula: '',
    },
  ]);
  const [editQuestionId, setEditQuestionId] = useState(null);
  const [showQuestionPreview, setShowQuestionPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showMathEditor, setShowMathEditor] = useState(null);
  const [mathInput, setMathInput] = useState('');
  const [topicInput, setTopicInput] = useState('');
  const [showTopicSuggestions, setShowTopicSuggestions] = useState(false);
  const [userSubjects, setUserSubjects] = useState([]);
  const [userClasses, setUserClasses] = useState([]);
  const [subjectClassMap, setSubjectClassMap] = useState({});
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [localError, setLocalError] = useState(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const editorRefs = useRef([]);
  const topicInputRef = useRef(null);

  // Brand Colors
  const colors = {
    forestGreen: '#4B5320',
    gold: '#D4A017',
    lightGold: '#FFD700',
    darkGold: '#B8860B',
    white: '#FFFFFF',
    lightGray: '#F8F9FA',
    mediumGray: '#E9ECEF',
    darkGray: '#6C757D',
    errorRed: '#DC3545',
    successGreen: '#28A745',
    warningYellow: '#FFC107',
    infoBlue: '#17A2B8'
  };

  // Comprehensive Mathematical Symbols and Formulas
  const mathSymbols = [
    // Basic Operations
    { label: 'Addition', latex: '+', display: '+', category: 'basic', icon: FiPlus },
    { label: 'Subtraction', latex: '-', display: '-', category: 'basic', icon: FiMinus },
    { label: 'Multiplication', latex: '\\times', display: '\\times', category: 'basic', icon: FiX },
    { label: 'Division', latex: '\\div', display: '\\div', category: 'basic', icon: FiDivide },
    { label: 'Equal', latex: '=', display: '=', category: 'basic', icon: FiCode },
    { label: 'Not Equal', latex: '\\neq', display: '\\neq', category: 'basic', icon: FiCode },
    
    // Fractions
    { label: 'Fraction', latex: '\\frac{a}{b}', display: '\\frac{a}{b}', category: 'fractions', icon: FiDivide },
    { label: 'Mixed Fraction', latex: '1\\frac{1}{2}', display: '1\\frac{1}{2}', category: 'fractions', icon: FiDivide },
    { label: 'Complex Fraction', latex: '\\frac{a}{\\frac{b}{c}}', display: '\\frac{a}{\\frac{b}{c}}', category: 'fractions', icon: FiDivide },
    
    // Roots and Powers
    { label: 'Square Root', latex: '\\sqrt{x}', display: '\\sqrt{x}', category: 'roots', icon: FiSquare },
    { label: 'Cube Root', latex: '\\sqrt[3]{x}', display: '\\sqrt[3]{x}', category: 'roots', icon: FiSquare },
    { label: 'nth Root', latex: '\\sqrt[n]{x}', display: '\\sqrt[n]{x}', category: 'roots', icon: FiSquare },
    { label: 'Square', latex: 'x^{2}', display: 'x^{2}', category: 'powers', icon: FiSquare },
    { label: 'Cube', latex: 'x^{3}', display: 'x^{3}', category: 'powers', icon: FiSquare },
    { label: 'Power', latex: 'x^{n}', display: 'x^{n}', category: 'powers', icon: FiSquare },
    
    // Greek Letters (Common)
    { label: 'Alpha', latex: '\\alpha', display: '\\alpha', category: 'greek', icon: FiType },
    { label: 'Beta', latex: '\\beta', display: '\\beta', category: 'greek', icon: FiType },
    { label: 'Gamma', latex: '\\gamma', display: '\\gamma', category: 'greek', icon: FiType },
    { label: 'Delta', latex: '\\Delta', display: '\\Delta', category: 'greek', icon: FiType },
    { label: 'Epsilon', latex: '\\epsilon', display: '\\epsilon', category: 'greek', icon: FiType },
    { label: 'Theta', latex: '\\theta', display: '\\theta', category: 'greek', icon: FiType },
    { label: 'Lambda', latex: '\\lambda', display: '\\lambda', category: 'greek', icon: FiType },
    { label: 'Pi', latex: '\\pi', display: '\\pi', category: 'greek', icon: FiType },
    { label: 'Sigma', latex: '\\Sigma', display: '\\Sigma', category: 'greek', icon: FiType },
    { label: 'Omega', latex: '\\Omega', display: '\\Omega', category: 'greek', icon: FiType },
    
    // Calculus
    { label: 'Derivative', latex: '\\frac{dy}{dx}', display: '\\frac{dy}{dx}', category: 'calculus', icon: FiActivity },
    { label: 'Second Derivative', latex: '\\frac{d^{2}y}{dx^{2}}', display: '\\frac{d^{2}y}{dx^{2}}', category: 'calculus', icon: FiActivity },
    { label: 'Partial Derivative', latex: '\\frac{\\partial y}{\\partial x}', display: '\\frac{\\partial y}{\\partial x}', category: 'calculus', icon: FiActivity },
    { label: 'Integral', latex: '\\int f(x) dx', display: '\\int f(x) dx', category: 'calculus', icon: FiActivity },
    { label: 'Definite Integral', latex: '\\int_{a}^{b} f(x) dx', display: '\\int_{a}^{b} f(x) dx', category: 'calculus', icon: FiActivity },
    { label: 'Double Integral', latex: '\\iint f(x,y) dx dy', display: '\\iint f(x,y) dx dy', category: 'calculus', icon: FiActivity },
    { label: 'Limit', latex: '\\lim_{x \\to a} f(x)', display: '\\lim_{x \\to a} f(x)', category: 'calculus', icon: FiActivity },
    { label: 'Summation', latex: '\\sum_{i=1}^{n} x_i', display: '\\sum_{i=1}^{n} x_i', category: 'calculus', icon: FiActivity },
    { label: 'Product', latex: '\\prod_{i=1}^{n} x_i', display: '\\prod_{i=1}^{n} x_i', category: 'calculus', icon: FiActivity },
    
    // Algebra
    { label: 'Quadratic Formula', latex: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}', display: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}', category: 'algebra', icon: FiGrid },
    { label: 'Binomial Theorem', latex: '(a+b)^n = \\sum_{k=0}^{n} \\binom{n}{k} a^{n-k} b^k', display: '(a+b)^n = \\sum_{k=0}^{n} \\binom{n}{k} a^{n-k} b^k', category: 'algebra', icon: FiGrid },
    { label: 'Combinatorial', latex: '\\binom{n}{k}', display: '\\binom{n}{k}', category: 'algebra', icon: FiGrid },
    { label: 'Absolute Value', latex: '|x|', display: '|x|', category: 'algebra', icon: FiGrid },
    
    // Geometry
    { label: 'Area of Circle', latex: 'A = \\pi r^{2}', display: 'A = \\pi r^{2}', category: 'geometry', icon: FiTarget },
    { label: 'Circumference', latex: 'C = 2\\pi r', display: 'C = 2\\pi r', category: 'geometry', icon: FiTarget },
    { label: 'Area of Triangle', latex: 'A = \\frac{1}{2} b h', display: 'A = \\frac{1}{2} b h', category: 'geometry', icon: FiTarget },
    { label: 'Pythagorean Theorem', latex: 'a^2 + b^2 = c^2', display: 'a^2 + b^2 = c^2', category: 'geometry', icon: FiTarget },
    { label: 'Distance Formula', latex: 'd = \\sqrt{(x_2-x_1)^2 + (y_2-y_1)^2}', display: 'd = \\sqrt{(x_2-x_1)^2 + (y_2-y_1)^2}', category: 'geometry', icon: FiTarget },
    
    // Trigonometry
    { label: 'Sine', latex: '\\sin \\theta', display: '\\sin \\theta', category: 'trigonometry', icon: FiWind },
    { label: 'Cosine', latex: '\\cos \\theta', display: '\\cos \\theta', category: 'trigonometry', icon: FiWind },
    { label: 'Tangent', latex: '\\tan \\theta', display: '\\tan \\theta', category: 'trigonometry', icon: FiWind },
    { label: 'Sin² + Cos²', latex: '\\sin^2 \\theta + \\cos^2 \\theta = 1', display: '\\sin^2 \\theta + \\cos^2 \\theta = 1', category: 'trigonometry', icon: FiWind },
    { label: 'Law of Sines', latex: '\\frac{a}{\\sin A} = \\frac{b}{\\sin B} = \\frac{c}{\\sin C}', display: '\\frac{a}{\\sin A} = \\frac{b}{\\sin B} = \\frac{c}{\\sin C}', category: 'trigonometry', icon: FiWind },
    { label: 'Law of Cosines', latex: 'c^2 = a^2 + b^2 - 2ab \\cos C', display: 'c^2 = a^2 + b^2 - 2ab \\cos C', category: 'trigonometry', icon: FiWind },
    
    // Physics - Mechanics
    { label: 'Newton\'s 2nd Law', latex: 'F = m a', display: 'F = m a', category: 'physics', icon: FiActivity },
    { label: 'Kinetic Energy', latex: 'E_k = \\frac{1}{2} m v^2', display: 'E_k = \\frac{1}{2} m v^2', category: 'physics', icon: FiActivity },
    { label: 'Potential Energy', latex: 'E_p = m g h', display: 'E_p = m g h', category: 'physics', icon: FiActivity },
    { label: 'Momentum', latex: 'p = m v', display: 'p = m v', category: 'physics', icon: FiActivity },
    { label: 'Work Done', latex: 'W = F s \\cos\\theta', display: 'W = F s \\cos\\theta', category: 'physics', icon: FiActivity },
    { label: 'Power', latex: 'P = \\frac{W}{t}', display: 'P = \\frac{W}{t}', category: 'physics', icon: FiActivity },
    { label: 'Hooke\'s Law', latex: 'F = -k x', display: 'F = -k x', category: 'physics', icon: FiActivity },
    
    // Physics - Thermodynamics
    { label: 'Ideal Gas Law', latex: 'PV = nRT', display: 'PV = nRT', category: 'physics', icon: FiThermometer },
    { label: 'Heat Transfer', latex: 'Q = m c \\Delta T', display: 'Q = m c \\Delta T', category: 'physics', icon: FiThermometer },
    { label: 'Efficiency', latex: '\\eta = \\frac{W_{out}}{Q_{in}}', display: '\\eta = \\frac{W_{out}}{Q_{in}}', category: 'physics', icon: FiThermometer },
    
    // Physics - Electricity
    { label: 'Ohm\'s Law', latex: 'V = IR', display: 'V = IR', category: 'physics', icon: FiZap },
    { label: 'Power (Electric)', latex: 'P = IV', display: 'P = IV', category: 'physics', icon: FiZap },
    { label: 'Resistance in Series', latex: 'R_{total} = R_1 + R_2 + R_3', display: 'R_{total} = R_1 + R_2 + R_3', category: 'physics', icon: FiZap },
    { label: 'Resistance in Parallel', latex: '\\frac{1}{R_{total}} = \\frac{1}{R_1} + \\frac{1}{R_2} + \\frac{1}{R_3}', display: '\\frac{1}{R_{total}} = \\frac{1}{R_1} + \\frac{1}{R_2} + \\frac{1}{R_3}', category: 'physics', icon: FiZap },
    { label: 'Coulomb\'s Law', latex: 'F = k \\frac{q_1 q_2}{r^2}', display: 'F = k \\frac{q_1 q_2}{r^2}', category: 'physics', icon: FiZap },
    
    // Physics - Waves
    { label: 'Wave Speed', latex: 'v = f \\lambda', display: 'v = f \\lambda', category: 'physics', icon: FiWind },
    { label: 'Snell\'s Law', latex: 'n_1 \\sin \\theta_1 = n_2 \\sin \\theta_2', display: 'n_1 \\sin \\theta_1 = n_2 \\sin \\theta_2', category: 'physics', icon: FiWind },
    { label: 'Lens Formula', latex: '\\frac{1}{f} = \\frac{1}{u} + \\frac{1}{v}', display: '\\frac{1}{f} = \\frac{1}{u} + \\frac{1}{v}', category: 'physics', icon: FiWind },
    
    // Physics - Modern
    { label: 'Planck\'s Equation', latex: 'E = h f', display: 'E = h f', category: 'physics', icon: FiSun },
    { label: 'Einstein\'s Mass-Energy', latex: 'E = m c^2', display: 'E = m c^2', category: 'physics', icon: FiSun },
    { label: 'De Broglie Wavelength', latex: '\\lambda = \\frac{h}{p}', display: '\\lambda = \\frac{h}{p}', category: 'physics', icon: FiSun },
    
    // Chemistry
    { label: 'Chemical Reaction', latex: '2H_2 + O_2 \\rightarrow 2H_2O', display: '2H_2 + O_2 \\rightarrow 2H_2O', category: 'chemistry', icon: FiDroplet },
    { label: 'Water', latex: 'H_2O', display: 'H_2O', category: 'chemistry', icon: FiDroplet },
    { label: 'Carbon Dioxide', latex: 'CO_2', display: 'CO_2', category: 'chemistry', icon: FiDroplet },
    { label: 'Methane', latex: 'CH_4', display: 'CH_4', category: 'chemistry', icon: FiDroplet },
    { label: 'Sodium Chloride', latex: 'NaCl', display: 'NaCl', category: 'chemistry', icon: FiDroplet },
    { label: 'Avogadro\'s Number', latex: 'N_A = 6.022 \\times 10^{23}', display: 'N_A = 6.022 \\times 10^{23}', category: 'chemistry', icon: FiDroplet },
    
    // Statistics
    { label: 'Mean', latex: '\\bar{x} = \\frac{\\sum x_i}{n}', display: '\\bar{x} = \\frac{\\sum x_i}{n}', category: 'statistics', icon: FiPercent },
    { label: 'Variance', latex: '\\sigma^2 = \\frac{\\sum (x_i - \\bar{x})^2}{n}', display: '\\sigma^2 = \\frac{\\sum (x_i - \\bar{x})^2}{n}', category: 'statistics', icon: FiPercent },
    { label: 'Standard Deviation', latex: '\\sigma = \\sqrt{\\frac{\\sum (x_i - \\bar{x})^2}{n}}', display: '\\sigma = \\sqrt{\\frac{\\sum (x_i - \\bar{x})^2}{n}}', category: 'statistics', icon: FiPercent },
    { label: 'Probability', latex: 'P(A) = \\frac{n(A)}{n(S)}', display: 'P(A) = \\frac{n(A)}{n(S)}', category: 'statistics', icon: FiPercent },
    
    // Vectors
    { label: 'Vector', latex: '\\vec{v} = x\\hat{i} + y\\hat{j} + z\\hat{k}', display: '\\vec{v} = x\\hat{i} + y\\hat{j} + z\\hat{k}', category: 'vectors', icon: FiTarget },
    { label: 'Magnitude', latex: '|\\vec{v}| = \\sqrt{x^2 + y^2 + z^2}', display: '|\\vec{v}| = \\sqrt{x^2 + y^2 + z^2}', category: 'vectors', icon: FiTarget },
    { label: 'Dot Product', latex: '\\vec{a} \\cdot \\vec{b} = |a||b|\\cos\\theta', display: '\\vec{a} \\cdot \\vec{b} = |a||b|\\cos\\theta', category: 'vectors', icon: FiTarget },
    { label: 'Cross Product', latex: '\\vec{a} \\times \\vec{b}', display: '\\vec{a} \\times \\vec{b}', category: 'vectors', icon: FiTarget },
    
    // Complex Numbers
    { label: 'Complex Number', latex: 'a + bi', display: 'a + bi', category: 'complex', icon: FiMoon },
    { label: 'Complex Conjugate', latex: '\\overline{a + bi} = a - bi', display: '\\overline{a + bi} = a - bi', category: 'complex', icon: FiMoon },
    { label: 'Modulus', latex: '|a + bi| = \\sqrt{a^2 + b^2}', display: '|a + bi| = \\sqrt{a^2 + b^2}', category: 'complex', icon: FiMoon },
    { label: 'Euler\'s Formula', latex: 'e^{i\\theta} = \\cos\\theta + i\\sin\\theta', display: 'e^{i\\theta} = \\cos\\theta + i\\sin\\theta', category: 'complex', icon: FiMoon },
  ];

  // Group symbols by category for better organization
  const mathCategories = [
    { id: 'basic', name: 'Basic Operations', icon: FiCode },
    { id: 'fractions', name: 'Fractions', icon: FiDivide },
    { id: 'roots', name: 'Roots & Powers', icon: FiSquare },
    { id: 'greek', name: 'Greek Letters', icon: FiType },
    { id: 'calculus', name: 'Calculus', icon: FiActivity },
    { id: 'algebra', name: 'Algebra', icon: FiGrid },
    { id: 'geometry', name: 'Geometry', icon: FiTarget },
    { id: 'trigonometry', name: 'Trigonometry', icon: FiWind },
    { id: 'physics', name: 'Physics', icon: FiZap },
    { id: 'chemistry', name: 'Chemistry', icon: FiDroplet },
    { id: 'statistics', name: 'Statistics', icon: FiPercent },
    { id: 'vectors', name: 'Vectors', icon: FiTarget },
    { id: 'complex', name: 'Complex Numbers', icon: FiMoon },
  ];

  const shortcuts = [
    { key: 'Ctrl + M', description: 'Open math editor' },
    { key: 'Enter', description: 'Insert formula' },
    { key: 'Escape', description: 'Close math editor' },
    { key: 'Ctrl + T', description: 'Focus topic input' },
  ];

  // Get current user ID from AuthContext
  const getCurrentUserId = () => {
    try {
      if (!user) return null;
      return user._id || user.id || user.userId || user.userID;
    } catch (e) {
      return null;
    }
  };

  // Get auth token
  const getToken = () => {
    try {
      const tokenKeys = ['token', 'authToken', 'jwtToken', 'accessToken'];
      
      // Check localStorage
      for (const key of tokenKeys) {
        const token = localStorage.getItem(key);
        if (token && token.trim() && token !== 'null' && token !== 'undefined') {
          return token.replace('Bearer ', '').trim();
        }
      }
      
      return null;
    } catch (error) {
      return null;
    }
  };

  // Initialize user and data
  useEffect(() => {
    const initializeUser = async () => {
      setIsLoadingUser(true);
      try {
        if (authLoading) return;
        
        if (authError) {
          setLocalError(`Authentication error: ${authError}`);
          setIsLoadingUser(false);
          return;
        }
        
        if (!user) {
          setLocalError('User not found. Please log in again.');
          setIsLoadingUser(false);
          return;
        }
        
        if (user.role !== 'teacher') {
          setLocalError('Access denied. Please log in as a teacher.');
          setIsLoadingUser(false);
          return;
        }
        
        extractTeacherData(user);
        
        const params = new URLSearchParams(window.location.search);
        const editId = params.get('edit');
        if (editId) {
          setEditQuestionId(editId);
        }
        
      } catch (error) {
        setLocalError('Failed to load user data. Please refresh the page.');
      } finally {
        setIsLoadingUser(false);
      }
    };
    
    initializeUser();
  }, [user, authLoading, authError]);

  // Extract teacher's subjects and classes
  const extractTeacherData = (teacherUser) => {
    if (!teacherUser || teacherUser.role !== 'teacher') return;
    
    const subjectsMap = new Map();
    const classesMap = new Map();
    const subjectClassMapping = {};
    
    if (teacherUser.teacherAssignments && teacherUser.teacherAssignments.length > 0) {
      teacherUser.teacherAssignments.forEach((assignment) => {
        if (!assignment.class) return;
        
        const classId = assignment.class._id || assignment.class;
        const className = assignment.className || assignment.class?.name || 'Unknown Class';
        
        if (!classesMap.has(classId.toString())) {
          classesMap.set(classId.toString(), {
            id: classId,
            name: className,
            _id: classId
          });
        }
        
        if (assignment.subjects && assignment.subjects.length > 0) {
          assignment.subjects.forEach((subject) => {
            if (!subject.subject) return;
            
            const subjectId = subject.subject._id || subject.subject;
            let subjectName = subject.subjectName || subject.subject?.name || 'Unknown Subject';
            subjectName = subjectName.replace(/I{2,}/g, 'I').trim();
            
            if (!subjectsMap.has(subjectName)) {
              subjectsMap.set(subjectName, true);
            }
            
            if (!subjectClassMapping[subjectName]) {
              subjectClassMapping[subjectName] = [];
            }
            if (!subjectClassMapping[subjectName].some(c => c.id === classId)) {
              subjectClassMapping[subjectName].push({
                id: classId,
                name: className
              });
            }
          });
        }
      });
    } else if (teacherUser.subjects && teacherUser.subjects.length > 0) {
      teacherUser.subjects.forEach((subject) => {
        if (!subject) return;
        
        let subjectName = subject.subject || subject.name || '';
        const classId = subject.class || subject.classId || '';
        const className = subject.className || subject.class || 'Unknown Class';
        
        if (!subjectName) return;
        subjectName = subjectName.replace(/I{2,}/g, 'I').trim();
        
        if (!subjectsMap.has(subjectName)) {
          subjectsMap.set(subjectName, true);
        }
        
        if (classId) {
          if (!classesMap.has(classId.toString())) {
            classesMap.set(classId.toString(), {
              id: classId,
              name: className,
              _id: classId
            });
          }
          
          if (!subjectClassMapping[subjectName]) {
            subjectClassMapping[subjectName] = [];
          }
          if (!subjectClassMapping[subjectName].some(c => c.id === classId)) {
            subjectClassMapping[subjectName].push({
              id: classId,
              name: className
            });
          }
        }
      });
    } else {
      setLocalError('No subjects or classes assigned. Please contact admin.');
    }
    
    const uniqueSubjects = Array.from(subjectsMap.keys());
    const uniqueClasses = Array.from(classesMap.values());
    
    setUserSubjects(uniqueSubjects);
    setUserClasses(uniqueClasses);
    setSubjectClassMap(subjectClassMapping);
    
    if (!editQuestionId && uniqueSubjects.length > 0 && uniqueClasses.length > 0) {
      const defaultSubject = uniqueSubjects[0];
      const defaultClasses = subjectClassMapping[defaultSubject] || uniqueClasses;
      
      if (defaultClasses.length > 0) {
        const newQuestionForms = [...questionForms];
        newQuestionForms[0].subject = defaultSubject;
        newQuestionForms[0].class = defaultClasses[0].id;
        setQuestionForms(newQuestionForms);
      }
    } else if (uniqueSubjects.length === 0) {
      setLocalError('No subjects assigned. Please contact administrator to assign subjects.');
    } else if (uniqueClasses.length === 0) {
      setLocalError('No classes assigned. Please contact administrator to assign classes.');
    }
  };

  // Get classes for selected subject
  const getClassesForSubject = (subject) => {
    if (!subject || !subjectClassMap[subject]) {
      return userClasses;
    }
    return subjectClassMap[subject];
  };

  // Get topic suggestions
  const getTopicSuggestions = () => {
    if (!topicInput.trim()) return mathSymbols.slice(0, 10);
    
    const lowercaseInput = topicInput.toLowerCase();
    const matches = mathSymbols.filter(symbol =>
      symbol.label.toLowerCase().includes(lowercaseInput) ||
      symbol.category.toLowerCase().includes(lowercaseInput) ||
      symbol.latex.toLowerCase().includes(lowercaseInput)
    );
    
    return matches.slice(0, 10);
  };

  // Render content to editor
  const renderContentToEditor = (content, index) => {
    if (editorRefs.current[index]) {
      editorRefs.current[index].innerHTML = '';
      content.forEach(item => {
        if (item.type === 'text') {
          const textNode = document.createTextNode(item.value);
          editorRefs.current[index].appendChild(textNode);
        } else if (item.type === 'latex') {
          const span = document.createElement('span');
          span.className = 'math-formula';
          span.dataset.latex = item.value;
          span.innerHTML = katex.renderToString(item.value, { throwOnError: false });
          span.onclick = () => {
            setMathInput(item.value);
            setShowMathEditor(index);
          };
          editorRefs.current[index].appendChild(span);
        }
      });
    }
  };

  // Handle editor input
  const handleEditorInput = (index) => {
    if (editorRefs.current[index]) {
      const nodes = Array.from(editorRefs.current[index].childNodes);
      const newContent = nodes.map(node => {
        if (node.nodeType === Node.TEXT_NODE) {
          return { type: 'text', value: node.textContent };
        } else if (node.nodeType === Node.ELEMENT_NODE && node.dataset.latex) {
          return { type: 'latex', value: node.dataset.latex };
        }
        return null;
      }).filter(item => item && item.value.trim());
      
      const newQuestionForms = [...questionForms];
      newQuestionForms[index].text = newContent;
      setQuestionForms(newQuestionForms);
    }
  };

  // Insert LaTeX into editor
  const insertLatex = (latex, index) => {
    if (!editorRefs.current[index] || !latex) return;

    const selection = window.getSelection();
    let range;
    if (selection.rangeCount && editorRefs.current[index].contains(selection.anchorNode)) {
      range = selection.getRangeAt(0);
    } else {
      range = document.createRange();
      range.selectNodeContents(editorRefs.current[index]);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }

    const span = document.createElement('span');
    span.className = 'math-formula';
    span.dataset.latex = latex;
    span.innerHTML = katex.renderToString(latex, { throwOnError: false });
    span.onclick = () => {
      setMathInput(latex);
      setShowMathEditor(index);
    };

    range.deleteContents();
    range.insertNode(span);
    range.setStartAfter(span);
    range.setEndAfter(span);
    selection.removeAllRanges();
    selection.addRange(range);

    handleEditorInput(index);
    setShowMathEditor(null);
    setMathInput('');
    setTopicInput('');
    setShowTopicSuggestions(false);
    editorRefs.current[index].focus();
  };

  // Handle math input
  const handleMathInput = (mathField) => {
    setMathInput(mathField.latex());
  };

  // Keyboard shortcuts
  const handleKeyDown = (e, index) => {
    if (e.ctrlKey && e.key === 'm') {
      e.preventDefault();
      setShowMathEditor(index);
      setMathInput('');
    } else if (e.ctrlKey && e.key === 't') {
      e.preventDefault();
      topicInputRef.current?.focus();
    }
    
    if (showMathEditor === index) {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (mathInput) insertLatex(mathInput, index);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowMathEditor(null);
        setMathInput('');
      }
    }
  };

  // Check if question is valid
  const isQuestionValid = (form) => {
    const textString = form.text.map(item => item.value).join(' ').trim();
    
    const hasSubjectClass = userSubjects.includes(form.subject) && 
      (getClassesForSubject(form.subject).some(cls => cls.id === form.class) || 
       userClasses.some(cls => cls.id === form.class));
    
    const nonEmptyOptions = form.options.filter(opt => opt && opt.trim());
    const hasValidOptions = nonEmptyOptions.length >= 2 && 
      nonEmptyOptions.length <= 6 &&
      form.correctAnswer && 
      nonEmptyOptions.includes(form.correctAnswer.trim());
    
    return (
      form.subject &&
      form.class &&
      textString &&
      hasValidOptions &&
      form.marks > 0 &&
      hasSubjectClass
    );
  };

  // Add new question form
  const addNewQuestionForm = () => {
    if (questionForms.length >= 10) {
      setError('Maximum 10 questions allowed at once.');
      return;
    }
    setQuestionForms([
      ...questionForms,
      {
        subject: userSubjects.length > 0 ? userSubjects[0] : '',
        class: userClasses.length > 0 ? userClasses[0].id : '',
        text: [],
        options: ['', '', '', ''],
        correctAnswer: '',
        marks: 1,
        saveToBank: true,
        formula: '',
      },
    ]);
    editorRefs.current.push(null);
  };

  // Remove question form
  const removeQuestionForm = (index) => {
    if (questionForms.length === 1) {
      setError('At least one question form is required.');
      return;
    }
    const newQuestionForms = questionForms.filter((_, i) => i !== index);
    setQuestionForms(newQuestionForms);
    editorRefs.current = editorRefs.current.filter((_, i) => i !== index);
    if (showQuestionPreview === index) setShowQuestionPreview(null);
    if (showMathEditor === index) setShowMathEditor(null);
  };

  // Handle question submission
  const handleQuestionSubmit = async (e) => {
    e.preventDefault();
    
    if (!user) {
      setError('User not found. Please log in again.');
      return;
    }
    
    if (user.role !== 'teacher') {
      setError('Access denied. Only teachers can create questions.');
      return;
    }
    
    // Validation
    const validationErrors = [];
    const validQuestions = [];
    
    questionForms.forEach((form, index) => {
      const textString = form.text.map(item => item.value).join(' ').trim();
      
      const hasSubjectClass = userSubjects.includes(form.subject) && 
        (getClassesForSubject(form.subject).some(cls => cls.id === form.class) || 
         userClasses.some(cls => cls.id === form.class));
      
      const nonEmptyOptions = form.options.filter(opt => opt && opt.trim());
      const hasValidOptions = nonEmptyOptions.length >= 2 && 
        nonEmptyOptions.length <= 6 &&
        form.correctAnswer && 
        nonEmptyOptions.includes(form.correctAnswer.trim());
      
      if (!form.subject) {
        validationErrors.push(`Question ${index + 1}: Subject is required`);
      } else if (!form.class) {
        validationErrors.push(`Question ${index + 1}: Class is required`);
      } else if (!textString) {
        validationErrors.push(`Question ${index + 1}: Question text is required`);
      } else if (!hasValidOptions) {
        validationErrors.push(`Question ${index + 1}: Must have 2-6 non-empty options and a valid correct answer`);
      } else if (!form.marks || form.marks <= 0) {
        validationErrors.push(`Question ${index + 1}: Marks must be greater than 0`);
      } else if (!hasSubjectClass) {
        validationErrors.push(`Question ${index + 1}: Invalid subject/class combination`);
      } else {
        validQuestions.push({ form, index });
      }
    });
    
    if (validationErrors.length > 0) {
      setError(`Please fix the following errors:\n${validationErrors.join('\n')}`);
      return;
    }
    
    if (validQuestions.length === 0) {
      setError('No valid questions to submit. Ensure all fields are filled correctly.');
      return;
    }
    
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const token = getToken();
      const userId = getCurrentUserId();
      
      if (!token) {
        throw new Error('No authentication token found. Please log in again.');
      }
      
      if (!userId) {
        throw new Error('User ID not found. Please log in again.');
      }

      // Prepare questions data
      const questionsData = validQuestions.map(({ form, index }) => {
        const textContent = form.text.map(item => item.value).join(' ').trim();
        const latexContent = form.text
          .filter(item => item.type === 'latex')
          .map(item => item.value);
        
        const normalizedSubject = form.subject.replace(/I{2,}/g, 'I').trim().toUpperCase();
        
        const cleanedOptions = form.options
          .filter(opt => opt && opt.trim())
          .map(opt => opt.trim());
        
        if (cleanedOptions.length < 2 || cleanedOptions.length > 6) {
          throw new Error(`Question ${index + 1}: Options must have 2-6 non-empty values`);
        }
        
        const cleanedCorrectAnswer = form.correctAnswer.trim();
        if (!cleanedOptions.includes(cleanedCorrectAnswer)) {
          throw new Error(`Question ${index + 1}: Correct answer must match one of the options`);
        }
        
        return {
          subject: normalizedSubject,
          class: form.class,
          text: textContent,
          type: 'multiple_choice',
          options: cleanedOptions,
          correctAnswer: cleanedCorrectAnswer,
          marks: parseInt(form.marks) || 1,
          difficulty: 'medium',
          saveToBank: form.saveToBank !== false,
          inQuestionBank: form.saveToBank !== false,
          formula: latexContent.join(';') || '',
          explanation: '',
          createdBy: userId,
          isActive: true,
          ...(testId && testId !== 'undefined' && { testId }),
        };
      });

      let response;
      if (editQuestionId) {
        response = await axios.put(`/api/teacher/questions/${editQuestionId}`, questionsData[0], {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        setSuccess('Question updated successfully!');
      } else {
        response = await axios.post('/api/teacher/questions/bulk', questionsData, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        const { message, createdCount } = response.data;
        setSuccess(`${message} - ${createdCount} question(s) created successfully`);
      }

      // Reset form after successful submission
      setQuestionForms([{
        subject: userSubjects.length > 0 ? userSubjects[0] : '',
        class: userClasses.length > 0 ? userClasses[0].id : '',
        text: [],
        options: ['', '', '', ''],
        correctAnswer: '',
        marks: 1,
        saveToBank: true,
        formula: '',
      }]);
      
      setShowQuestionPreview(null);
      setEditQuestionId(null);
      editorRefs.current = [null];
      
      // Navigate back after delay
      setTimeout(() => {
        navigate(testId && testId !== 'undefined' ? `/teacher/test-creation/${testId}/questions` : '/teacher/questions');
      }, 2000);
      
    } catch (err) {
      console.error('Error creating questions:', err);
      
      if (err.response?.status === 401) {
        setError('Session expired. Please log in again.');
        localStorage.clear();
        sessionStorage.clear();
        navigate('/login');
      } else if (err.response?.status === 403) {
        setError('You do not have permission to create questions. Only teachers can access this.');
      } else if (err.response?.status === 400) {
        const errors = err.response.data?.errors || [];
        const errorMsg = Array.isArray(errors) ? errors.join(', ') : err.response.data?.error || 'Validation failed';
        setError(`Validation error: ${errorMsg}`);
      } else if (err.response?.status === 500) {
        setError('Server error. Please try again later.');
      } else if (!err.response) {
        setError(`Network error: ${err.message}`);
      } else {
        setError(err.response?.data?.message || err.response?.data?.error || 'Failed to create questions.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Preview question
  const handlePreviewQuestion = (index) => {
    if (!isQuestionValid(questionForms[index])) {
      setError('Fill all fields for this question to preview, including 2-6 non-empty options and a matching correct answer.');
      return;
    }
    setShowQuestionPreview(index);
  };

  // Render preview content
  const renderPreviewContent = (form) => {
    return form.text.map((item, index) => {
      if (item.type === 'text') {
        return <span key={index}>{item.value}</span>;
      } else if (item.type === 'latex') {
        return (
          <span
            key={index}
            className="math-formula"
            dangerouslySetInnerHTML={{ __html: katex.renderToString(item.value, { throwOnError: false }) }}
          />
        );
      }
      return null;
    });
  };

  // Loading state
  if (authLoading || isLoadingUser) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '60vh',
        color: colors.forestGreen 
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '20px' }}>
            <FiUser style={{ animation: 'spin 1s linear infinite' }} />
          </div>
          <p style={{ fontSize: '18px', fontWeight: '500' }}>
            Loading user data...
          </p>
        </div>
      </div>
    );
  }

  // Error states
  if (authError) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '60vh',
        color: colors.forestGreen 
      }}>
        <div style={{ textAlign: 'center', maxWidth: '500px', padding: '40px' }}>
          <div style={{ 
            fontSize: '48px', 
            marginBottom: '20px',
            color: colors.errorRed 
          }}>
            <FiAlertTriangle />
          </div>
          <h2 style={{ color: colors.forestGreen, marginBottom: '20px' }}>
            Authentication Error
          </h2>
          <p style={{ marginBottom: '30px', color: colors.darkGray }}>
            {authError}
          </p>
          <button
            onClick={() => navigate('/login')}
            style={{
              backgroundColor: colors.forestGreen,
              color: colors.white,
              border: 'none',
              padding: '12px 30px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '16px',
              margin: '0 auto',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3a4220'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.forestGreen}
          >
            <FiLogIn />
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '60vh',
        color: colors.forestGreen 
      }}>
        <div style={{ textAlign: 'center', maxWidth: '500px', padding: '40px' }}>
          <div style={{ 
            fontSize: '48px', 
            marginBottom: '20px',
            color: colors.errorRed 
          }}>
            <FiAlertTriangle />
          </div>
          <h2 style={{ color: colors.forestGreen, marginBottom: '20px' }}>
            User Not Found
          </h2>
          <p style={{ marginBottom: '30px', color: colors.darkGray }}>
            We couldn't find your user data. Please log in again to continue.
          </p>
          <button
            onClick={() => navigate('/login')}
            style={{
              backgroundColor: colors.forestGreen,
              color: colors.white,
              border: 'none',
              padding: '12px 30px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '16px',
              margin: '0 auto',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3a4220'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.forestGreen}
          >
            <FiLogIn />
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (user.role !== 'teacher') {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '60vh',
        color: colors.forestGreen 
      }}>
        <div style={{ textAlign: 'center', maxWidth: '500px', padding: '40px' }}>
          <div style={{ 
            fontSize: '48px', 
            marginBottom: '20px',
            color: colors.errorRed 
          }}>
            <FiAlertTriangle />
          </div>
          <h2 style={{ color: colors.forestGreen, marginBottom: '20px' }}>
            Access Denied
          </h2>
          <p style={{ marginBottom: '20px', color: colors.darkGray }}>
            You are logged in as <strong>{user.role}</strong>, but this page is only accessible to teachers.
          </p>
          <p style={{ marginBottom: '30px', color: colors.darkGray, fontSize: '14px' }}>
            User: {user.username} | Role: {user.role}
          </p>
          <button
            onClick={() => navigate('/')}
            style={{
              backgroundColor: colors.forestGreen,
              color: colors.white,
              border: 'none',
              padding: '12px 30px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '16px',
              margin: '0 auto',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3a4220'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.forestGreen}
          >
            <FiLogIn />
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      padding: '20px', 
      maxWidth: '900px', 
      margin: '0 auto',
      backgroundColor: colors.lightGray,
      minHeight: '100vh'
    }}>
      <script src="https://cdn.jsdelivr.net/npm/mathjax@3.2.2/es5/tex-mml-chtml.js" id="MathJax-script"></script>
      
      {/* User Info Bar */}
      <div style={{
        backgroundColor: colors.white,
        borderRadius: '8px',
        padding: '15px 20px',
        marginBottom: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
        border: `1px solid ${colors.mediumGray}`
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            backgroundColor: colors.forestGreen,
            color: colors.white,
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: '600',
            fontSize: '16px'
          }}>
            {user.username?.charAt(0).toUpperCase() || 'T'}
          </div>
          <div>
            <div style={{ 
              fontWeight: '600', 
              color: colors.forestGreen,
              fontSize: '16px'
            }}>
              {user.name || user.username}
            </div>
            <div style={{ 
              color: colors.darkGray, 
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{ 
                backgroundColor: colors.gold,
                color: colors.forestGreen,
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: '600'
              }}>
                Teacher
              </span>
              <span>•</span>
              <span>Subjects: {userSubjects.length}</span>
              <span>•</span>
              <span>Classes: {userClasses.length}</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Error Message */}
      {(error || localError) && (
        <div style={{
          backgroundColor: '#FFF5F5',
          color: colors.errorRed,
          padding: '16px',
          borderRadius: '8px',
          marginBottom: '20px',
          borderLeft: `4px solid ${colors.errorRed}`,
          display: 'flex',
          alignItems: 'center',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <FiAlertTriangle style={{ marginRight: '12px', fontSize: '20px', flexShrink: 0 }} />
          <span style={{ flex: 1 }}>{error || localError}</span>
        </div>
      )}
      
      {/* Success Message */}
      {success && (
        <div style={{
          backgroundColor: '#F0FFF4',
          color: colors.successGreen,
          padding: '16px',
          borderRadius: '8px',
          marginBottom: '20px',
          borderLeft: `4px solid ${colors.successGreen}`,
          display: 'flex',
          alignItems: 'center',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <FiCheckCircle style={{ marginRight: '12px', fontSize: '20px', flexShrink: 0 }} />
          <span style={{ flex: 1 }}>{success}</span>
        </div>
      )}
      
      {/* Main Form Container */}
      <div style={{
        backgroundColor: colors.white,
        borderRadius: '12px',
        padding: '30px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        marginBottom: '30px'
      }}>
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '25px',
          borderBottom: `2px solid ${colors.mediumGray}`,
          paddingBottom: '15px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              backgroundColor: colors.forestGreen,
              color: colors.white,
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px'
            }}>
              <FiBookOpen />
            </div>
            <div>
              <h1 style={{
                color: colors.forestGreen,
                margin: '0',
                fontSize: '24px',
                fontWeight: '700'
              }}>
                {editQuestionId ? 'Edit Question' : 'Create New Question'}
              </h1>
              <p style={{
                color: colors.darkGray,
                margin: '5px 0 0 0',
                fontSize: '14px'
              }}>
                {editQuestionId ? 'Update existing question details' : 'Add multiple choice questions with formulas'}
              </p>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => setShowHelp(!showHelp)}
              style={{
                backgroundColor: colors.gold,
                color: colors.forestGreen,
                border: 'none',
                padding: '10px 16px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.lightGold}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.gold}
            >
              <FiHelpCircle />
              {showHelp ? 'Hide Help' : 'Show Help'}
            </button>
            
            {!editQuestionId && (
              <button
                onClick={addNewQuestionForm}
                disabled={questionForms.length >= 10 || loading}
                style={{
                  backgroundColor: questionForms.length >= 10 || loading ? colors.mediumGray : colors.forestGreen,
                  color: colors.white,
                  border: 'none',
                  padding: '10px 16px',
                  borderRadius: '8px',
                  cursor: questionForms.length >= 10 || loading ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '14px',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  if (questionForms.length < 10 && !loading) {
                    e.currentTarget.style.backgroundColor = '#3a4220';
                  }
                }}
                onMouseLeave={(e) => {
                  if (questionForms.length < 10 && !loading) {
                    e.currentTarget.style.backgroundColor = colors.forestGreen;
                  }
                }}
              >
                <FiPlus />
                Add Question ({questionForms.length}/10)
              </button>
            )}
          </div>
        </div>
        
        {/* Help Section */}
        {showHelp && (
          <div style={{
            backgroundColor: '#FFF9E6',
            padding: '20px',
            borderRadius: '8px',
            marginBottom: '25px',
            border: `1px solid ${colors.gold}`
          }}>
            <h4 style={{ 
              color: colors.forestGreen, 
              marginTop: '0', 
              marginBottom: '15px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <FiHelpCircle />
              Quick Help Guide
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
              <div>
                <h5 style={{ color: colors.forestGreen, margin: '0 0 10px 0', fontSize: '14px' }}>Teacher Info</h5>
                <div style={{ color: colors.darkGray, fontSize: '13px' }}>
                  <p style={{ margin: '0 0 8px 0' }}>
                    <strong>Subjects:</strong> {userSubjects.length > 0 ? userSubjects.join(', ') : 'No subjects assigned'}
                  </p>
                  <p style={{ margin: '0 0 8px 0' }}>
                    <strong>Classes:</strong> {userClasses.length > 0 ? userClasses.map(c => c.name).join(', ') : 'No classes assigned'}
                  </p>
                  {userSubjects.length === 0 && (
                    <p style={{ color: colors.errorRed, margin: '10px 0 0 0', fontSize: '12px' }}>
                      <FiAlertTriangle style={{ marginRight: '5px' }} />
                      Please contact admin to assign subjects and classes
                    </p>
                  )}
                </div>
              </div>
              <div>
                <h5 style={{ color: colors.forestGreen, margin: '0 0 10px 0', fontSize: '14px' }}>Keyboard Shortcuts</h5>
                <ul style={{ listStyle: 'none', padding: '0', margin: '0' }}>
                  {shortcuts.map((shortcut, index) => (
                    <li key={index} style={{ 
                      marginBottom: '8px', 
                      color: colors.darkGray,
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <code style={{ 
                        backgroundColor: colors.forestGreen, 
                        color: colors.white, 
                        padding: '2px 6px', 
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '500'
                      }}>
                        {shortcut.key}
                      </code>
                      <span>{shortcut.description}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            
            {/* Formula Categories */}
            <div style={{ marginTop: '20px' }}>
              <h5 style={{ color: colors.forestGreen, margin: '0 0 10px 0', fontSize: '14px' }}>
                Available Formula Categories
              </h5>
              <div style={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                gap: '8px',
                marginTop: '10px'
              }}>
                {mathCategories.map((category, index) => {
                  const Icon = category.icon;
                  return (
                    <span key={category.id} style={{
                      backgroundColor: colors.lightGray,
                      color: colors.forestGreen,
                      padding: '6px 12px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: '500',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      border: `1px solid ${colors.mediumGray}`
                    }}>
                      <Icon size={12} />
                      {category.name}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        )}
        
        {/* Question Forms */}
        <form onSubmit={handleQuestionSubmit}>
          {questionForms.map((form, index) => {
            const classesForSubject = getClassesForSubject(form.subject);
            const selectedClass = classesForSubject.find(cls => cls.id === form.class) || 
                                 userClasses.find(cls => cls.id === form.class);
            
            return (
              <div key={index} style={{
                border: `1px solid ${colors.mediumGray}`,
                borderRadius: '10px',
                padding: '20px',
                marginBottom: '20px',
                backgroundColor: index % 2 === 0 ? colors.white : '#FAFCF5',
                position: 'relative'
              }}>
                {/* Question Header */}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  marginBottom: '20px',
                  paddingBottom: '15px',
                  borderBottom: `1px solid ${colors.mediumGray}`
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      backgroundColor: colors.forestGreen,
                      color: colors.white,
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: '600',
                      fontSize: '14px'
                    }}>
                      {index + 1}
                    </div>
                    <h3 style={{ 
                      color: colors.forestGreen, 
                      margin: '0',
                      fontSize: '18px',
                      fontWeight: '600'
                    }}>
                      Question {index + 1}
                    </h3>
                  </div>
                  
                  {!editQuestionId && questionForms.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeQuestionForm(index)}
                      style={{
                        backgroundColor: '#FFE5E5',
                        color: colors.errorRed,
                        border: `1px solid ${colors.errorRed}`,
                        padding: '6px 12px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        fontSize: '13px',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FFD1D1'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FFE5E5'}
                    >
                      <FiMinus />
                      Remove
                    </button>
                  )}
                </div>
                
                {/* Subject and Class Selection */}
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                  gap: '20px', 
                  marginBottom: '25px' 
                }}>
                  <div>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '8px', 
                      color: colors.forestGreen, 
                      fontWeight: '600',
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <FiBook style={{ fontSize: '14px' }} />
                      Subject
                    </label>
                    <select
                      value={form.subject}
                      onChange={(e) => {
                        const newQuestionForms = [...questionForms];
                        newQuestionForms[index].subject = e.target.value;
                        const newClasses = getClassesForSubject(e.target.value);
                        newQuestionForms[index].class = newClasses.length > 0 ? newClasses[0].id : '';
                        setQuestionForms(newQuestionForms);
                      }}
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: `1px solid ${colors.mediumGray}`,
                        borderRadius: '8px',
                        backgroundColor: colors.white,
                        color: colors.forestGreen,
                        fontSize: '14px',
                        outline: 'none',
                        transition: 'border 0.2s ease',
                        cursor: editQuestionId ? 'not-allowed' : 'pointer'
                      }}
                      disabled={editQuestionId}
                      onFocus={(e) => e.target.style.borderColor = colors.forestGreen}
                      onBlur={(e) => e.target.style.borderColor = colors.mediumGray}
                    >
                      <option value="">Select Subject</option>
                      {userSubjects.map(subject => (
                        <option key={subject} value={subject}>{subject}</option>
                      ))}
                    </select>
                    {userSubjects.length === 0 && (
                      <div style={{ 
                        color: colors.errorRed, 
                        fontSize: '12px', 
                        marginTop: '5px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}>
                        <FiAlertTriangle size={12} />
                        No subjects assigned
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '8px', 
                      color: colors.forestGreen, 
                      fontWeight: '600',
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <FiHash style={{ fontSize: '14px' }} />
                      Class
                    </label>
                    <select
                      value={form.class}
                      onChange={(e) => {
                        const newQuestionForms = [...questionForms];
                        newQuestionForms[index].class = e.target.value;
                        setQuestionForms(newQuestionForms);
                      }}
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: `1px solid ${colors.mediumGray}`,
                        borderRadius: '8px',
                        backgroundColor: colors.white,
                        color: colors.forestGreen,
                        fontSize: '14px',
                        outline: 'none',
                        transition: 'border 0.2s ease',
                        cursor: editQuestionId || !form.subject ? 'not-allowed' : 'pointer'
                      }}
                      disabled={editQuestionId || !form.subject}
                      onFocus={(e) => e.target.style.borderColor = colors.forestGreen}
                      onBlur={(e) => e.target.style.borderColor = colors.mediumGray}
                    >
                      <option value="">Select Class</option>
                      {classesForSubject.map(cls => (
                        <option key={cls.id} value={cls.id}>{cls.name}</option>
                      ))}
                    </select>
                    {form.subject && classesForSubject.length === 0 && (
                      <div style={{ 
                        color: colors.warningYellow, 
                        fontSize: '12px', 
                        marginTop: '5px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}>
                        <FiAlertTriangle size={12} />
                        No specific classes for this subject
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Question Text Editor */}
                <div style={{ marginBottom: '25px' }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '10px', 
                    color: colors.forestGreen, 
                    fontWeight: '600',
                    fontSize: '14px'
                  }}>
                    Question Text
                  </label>
                  <div
                    ref={el => editorRefs.current[index] = el}
                    contentEditable
                    onInput={() => handleEditorInput(index)}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                    style={{
                      border: `1px solid ${colors.mediumGray}`,
                      borderRadius: '8px',
                      padding: '15px',
                      minHeight: '120px',
                      backgroundColor: colors.white,
                      outline: 'none',
                      fontSize: '14px',
                      lineHeight: '1.5',
                      transition: 'border 0.2s ease'
                    }}
                    onFocus={(e) => e.currentTarget.style.borderColor = colors.forestGreen}
                    onBlur={(e) => e.currentTarget.style.borderColor = colors.mediumGray}
                  />
                  
                  {/* Quick Math Symbols */}
                  <div style={{ marginTop: '15px' }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      marginBottom: '10px',
                      color: colors.forestGreen,
                      fontWeight: '500',
                      fontSize: '13px'
                    }}>
                      <FiHash style={{ marginRight: '8px' }} />
                      Quick Insert:
                    </div>
                    <div style={{ 
                      display: 'flex', 
                      gap: '8px', 
                      flexWrap: 'wrap' 
                    }}>
                      {mathSymbols.slice(0, 8).map((symbol, idx) => {
                        const Icon = symbol.icon;
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => insertLatex(symbol.latex, index)}
                            style={{
                              backgroundColor: colors.lightGray,
                              color: colors.forestGreen,
                              border: `1px solid ${colors.mediumGray}`,
                              padding: '8px 12px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontWeight: '500',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontSize: '12px',
                              transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.mediumGray}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.lightGray}
                            title={symbol.label}
                          >
                            <Icon size={12} />
                            <span style={{ 
                              maxWidth: '100px', 
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              {symbol.display.length > 15 ? symbol.display.substring(0, 15) + '...' : symbol.display}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  
                  {/* Math Tools */}
                  <div style={{ 
                    display: 'flex', 
                    gap: '10px', 
                    marginTop: '15px',
                    flexWrap: 'wrap' 
                  }}>
                    <button
                      type="button"
                      onClick={() => {
                        setShowMathEditor(index);
                        setMathInput('');
                      }}
                      style={{
                        backgroundColor: colors.forestGreen,
                        color: colors.white,
                        border: 'none',
                        padding: '10px 16px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '13px',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3a4220'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.forestGreen}
                    >
                      <FiHash />
                      Advanced Math Editor (Ctrl+M)
                    </button>
                    
                    <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
                      <input
                        ref={topicInputRef}
                        type="text"
                        value={topicInput}
                        onChange={(e) => {
                          setTopicInput(e.target.value);
                          setShowTopicSuggestions(true);
                        }}
                        placeholder="Search 100+ formulas by name or topic (Ctrl+T)"
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: `1px solid ${colors.mediumGray}`,
                          borderRadius: '6px',
                          fontSize: '13px',
                          outline: 'none',
                          transition: 'border 0.2s ease'
                        }}
                        onFocus={(e) => e.currentTarget.style.borderColor = colors.forestGreen}
                        onBlur={(e) => setTimeout(() => setShowTopicSuggestions(false), 200)}
                      />
                      
                      {showTopicSuggestions && getTopicSuggestions().length > 0 && (
                        <div style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          right: 0,
                          backgroundColor: colors.white,
                          border: `1px solid ${colors.mediumGray}`,
                          borderRadius: '6px',
                          marginTop: '5px',
                          maxHeight: '300px',
                          overflowY: 'auto',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                          zIndex: 1000
                        }}>
                          {getTopicSuggestions().map((symbol, idx) => {
                            const Icon = symbol.icon;
                            return (
                              <div
                                key={idx}
                                style={{
                                  padding: '12px',
                                  cursor: 'pointer',
                                  borderBottom: `1px solid ${colors.mediumGray}`,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '12px',
                                  transition: 'background-color 0.2s ease'
                                }}
                                onClick={() => {
                                  insertLatex(symbol.latex, index);
                                  setTopicInput('');
                                  setShowTopicSuggestions(false);
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.lightGray}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                              >
                                <div style={{
                                  backgroundColor: colors.gold,
                                  color: colors.forestGreen,
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '6px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0
                                }}>
                                  <Icon size={16} />
                                </div>
                                <div style={{ flex: 1 }}>
                                  <div style={{ 
                                    fontWeight: '600', 
                                    color: colors.forestGreen,
                                    fontSize: '13px',
                                    marginBottom: '4px'
                                  }}>
                                    {symbol.label}
                                  </div>
                                  <div style={{ 
                                    color: colors.darkGray,
                                    fontSize: '11px',
                                    marginBottom: '2px'
                                  }}>
                                    {symbol.category.charAt(0).toUpperCase() + symbol.category.slice(1)}
                                  </div>
                                  <div style={{ 
                                    color: colors.darkGray,
                                    fontSize: '12px'
                                  }}>
                                    <span dangerouslySetInnerHTML={{ 
                                      __html: katex.renderToString(symbol.display, { 
                                        throwOnError: false,
                                        displayMode: false 
                                      }) 
                                    }} />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Math Editor Modal */}
                {showMathEditor === index && (
                  <div style={{
                    backgroundColor: colors.lightGray,
                    padding: '20px',
                    borderRadius: '8px',
                    marginBottom: '20px',
                    border: `1px solid ${colors.mediumGray}`
                  }}>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      marginBottom: '15px'
                    }}>
                      <h4 style={{ 
                        color: colors.forestGreen, 
                        margin: '0',
                        fontSize: '15px',
                        fontWeight: '600'
                      }}>
                        Advanced Math Formula Editor
                      </h4>
                      <span style={{ 
                        color: colors.darkGray, 
                        fontSize: '12px',
                        backgroundColor: colors.white,
                        padding: '3px 8px',
                        borderRadius: '4px',
                        border: `1px solid ${colors.mediumGray}`
                      }}>
                        Press Enter to insert, Esc to cancel
                      </span>
                    </div>
                    
                    <EditableMathField
                      latex={mathInput}
                      onChange={handleMathInput}
                      style={{ 
                        width: '100%', 
                        padding: '15px', 
                        border: `1px solid ${colors.mediumGray}`, 
                        borderRadius: '8px',
                        backgroundColor: colors.white,
                        fontSize: '14px',
                        outline: 'none',
                        marginBottom: '15px'
                      }}
                    />
                    
                    {/* Formula Categories Grid */}
                    <div style={{ marginBottom: '20px' }}>
                      <h5 style={{ 
                        color: colors.forestGreen, 
                        margin: '0 0 10px 0',
                        fontSize: '13px',
                        fontWeight: '600'
                      }}>
                        Formula Library
                      </h5>
                      <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', 
                        gap: '10px',
                        maxHeight: '200px',
                        overflowY: 'auto',
                        padding: '10px',
                        backgroundColor: colors.white,
                        borderRadius: '6px',
                        border: `1px solid ${colors.mediumGray}`
                      }}>
                        {mathCategories.map((category) => (
                          <button
                            key={category.id}
                            type="button"
                            onClick={() => {
                              const categorySymbols = mathSymbols.filter(s => s.category === category.id);
                              if (categorySymbols.length > 0) {
                                insertLatex(categorySymbols[0].latex, index);
                              }
                            }}
                            style={{
                              backgroundColor: colors.lightGray,
                              color: colors.forestGreen,
                              border: `1px solid ${colors.mediumGray}`,
                              padding: '8px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontWeight: '500',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              fontSize: '12px',
                              transition: 'all 0.2s ease',
                              textAlign: 'left'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.mediumGray}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.lightGray}
                          >
                            <category.icon size={14} />
                            <span style={{ flex: 1 }}>{category.name}</span>
                            <span style={{ 
                              backgroundColor: colors.gold,
                              color: colors.forestGreen,
                              fontSize: '11px',
                              padding: '2px 6px',
                              borderRadius: '10px'
                            }}>
                              {mathSymbols.filter(s => s.category === category.id).length}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        type="button"
                        onClick={() => insertLatex(mathInput, index)}
                        disabled={!mathInput.trim()}
                        style={{
                          backgroundColor: mathInput.trim() ? colors.forestGreen : colors.mediumGray,
                          color: colors.white,
                          border: 'none',
                          padding: '10px 20px',
                          borderRadius: '6px',
                          cursor: mathInput.trim() ? 'pointer' : 'not-allowed',
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontSize: '13px',
                          flex: 1,
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          if (mathInput.trim()) {
                            e.currentTarget.style.backgroundColor = '#3a4220';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (mathInput.trim()) {
                            e.currentTarget.style.backgroundColor = colors.forestGreen;
                          }
                        }}
                      >
                        <FiPlus />
                        Insert Formula (Enter)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowMathEditor(null);
                          setMathInput('');
                        }}
                        style={{
                          backgroundColor: '#FFE5E5',
                          color: colors.errorRed,
                          border: `1px solid ${colors.errorRed}`,
                          padding: '10px 20px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontSize: '13px',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FFD1D1'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FFE5E5'}
                      >
                        <FiX />
                        Cancel (Esc)
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Options Section */}
                <div style={{ marginBottom: '25px' }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '15px', 
                    color: colors.forestGreen, 
                    fontWeight: '600',
                    fontSize: '14px'
                  }}>
                    Options (Mark the correct one) - Need 2-6 non-empty options
                  </label>
                  
                  <div style={{ display: 'grid', gap: '15px' }}>
                    {form.options.map((option, optIndex) => (
                      <div key={optIndex} style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '15px',
                        padding: '12px',
                        backgroundColor: colors.white,
                        borderRadius: '8px',
                        border: `1px solid ${colors.mediumGray}`,
                        transition: 'border 0.2s ease'
                      }}>
                        <div style={{
                          backgroundColor: colors.forestGreen,
                          color: colors.white,
                          width: '28px',
                          height: '28px',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: '600',
                          fontSize: '13px',
                          flexShrink: 0
                        }}>
                          {String.fromCharCode(65 + optIndex)}
                        </div>
                        
                        <input
                          type="text"
                          value={option}
                          onChange={(e) => {
                            const newQuestionForms = [...questionForms];
                            newQuestionForms[index].options[optIndex] = e.target.value;
                            if (newQuestionForms[index].correctAnswer === option) {
                              newQuestionForms[index].correctAnswer = e.target.value;
                            }
                            setQuestionForms(newQuestionForms);
                          }}
                          placeholder={`Enter option ${optIndex + 1}`}
                          style={{
                            flex: 1,
                            padding: '10px',
                            border: `1px solid ${colors.mediumGray}`,
                            borderRadius: '6px',
                            fontSize: '14px',
                            outline: 'none',
                            transition: 'border 0.2s ease'
                          }}
                          onFocus={(e) => e.currentTarget.style.borderColor = colors.forestGreen}
                          onBlur={(e) => e.currentTarget.style.borderColor = colors.mediumGray}
                        />
                        
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '8px',
                          flexShrink: 0
                        }}>
                          <input
                            type="radio"
                            name={`correctAnswer-${index}`}
                            value={option}
                            checked={form.correctAnswer === option}
                            onChange={(e) => {
                              const newQuestionForms = [...questionForms];
                              newQuestionForms[index].correctAnswer = e.target.value;
                              setQuestionForms(newQuestionForms);
                            }}
                            disabled={!option.trim()}
                            style={{
                              width: '18px',
                              height: '18px',
                              cursor: option.trim() ? 'pointer' : 'not-allowed'
                            }}
                          />
                          <label style={{ 
                            color: colors.forestGreen, 
                            fontWeight: '600',
                            fontSize: '13px',
                            cursor: option.trim() ? 'pointer' : 'not-allowed'
                          }}>
                            Correct
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Option validation message */}
                  <div style={{ marginTop: '10px' }}>
                    <div style={{ 
                      fontSize: '12px', 
                      color: form.options.filter(opt => opt.trim()).length >= 2 ? colors.successGreen : colors.errorRed,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      {form.options.filter(opt => opt.trim()).length >= 2 ? '✓' : '⚠'}
                      {form.options.filter(opt => opt.trim()).length >= 2 
                        ? `Valid: ${form.options.filter(opt => opt.trim()).length} non-empty options` 
                        : `Need at least 2 non-empty options (currently ${form.options.filter(opt => opt.trim()).length})`
                      }
                    </div>
                  </div>
                </div>
                
                {/* Marks and Save Options */}
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                  gap: '20px', 
                  marginBottom: '25px' 
                }}>
                  <div>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '8px', 
                      color: colors.forestGreen, 
                      fontWeight: '600',
                      fontSize: '14px'
                    }}>
                      Marks
                    </label>
                    <input
                      type="number"
                      value={form.marks}
                      onChange={(e) => {
                        const newQuestionForms = [...questionForms];
                        newQuestionForms[index].marks = parseInt(e.target.value) || 1;
                        setQuestionForms(newQuestionForms);
                      }}
                      min="1"
                      max="100"
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: `1px solid ${colors.mediumGray}`,
                        borderRadius: '8px',
                        backgroundColor: colors.white,
                        color: colors.forestGreen,
                        fontSize: '14px',
                        outline: 'none',
                        transition: 'border 0.2s ease'
                      }}
                      onFocus={(e) => e.currentTarget.style.borderColor = colors.forestGreen}
                      onBlur={(e) => e.currentTarget.style.borderColor = colors.mediumGray}
                    />
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <label style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      color: colors.forestGreen, 
                      fontWeight: '600',
                      fontSize: '14px',
                      cursor: 'pointer',
                      gap: '10px'
                    }}>
                      <input
                        type="checkbox"
                        checked={form.saveToBank}
                        onChange={(e) => {
                          const newQuestionForms = [...questionForms];
                          newQuestionForms[index].saveToBank = e.target.checked;
                          setQuestionForms(newQuestionForms);
                        }}
                        style={{
                          width: '18px',
                          height: '18px',
                          cursor: 'pointer'
                        }}
                      />
                      <span>Save to Question Bank</span>
                    </label>
                  </div>
                </div>
                
                {/* Preview Button */}
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <button
                    type="button"
                    onClick={() => handlePreviewQuestion(index)}
                    disabled={loading || !isQuestionValid(form)}
                    style={{
                      backgroundColor: loading || !isQuestionValid(form) ? colors.mediumGray : colors.gold,
                      color: colors.forestGreen,
                      border: 'none',
                      padding: '12px 24px',
                      borderRadius: '8px',
                      cursor: loading || !isQuestionValid(form) ? 'not-allowed' : 'pointer',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '14px',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (!loading && isQuestionValid(form)) {
                        e.currentTarget.style.backgroundColor = colors.lightGold;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!loading && isQuestionValid(form)) {
                        e.currentTarget.style.backgroundColor = colors.gold;
                      }
                    }}
                  >
                    <FiBookOpen />
                    Preview Question {index + 1}
                  </button>
                </div>
              </div>
            );
          })}
          
          {/* Action Buttons */}
          <div style={{ 
            display: 'flex', 
            gap: '15px', 
            marginTop: '30px',
            paddingTop: '25px',
            borderTop: `1px solid ${colors.mediumGray}`
          }}>
            <button
              type="submit"
              disabled={loading || questionForms.filter(isQuestionValid).length === 0}
              style={{
                backgroundColor: loading || questionForms.filter(isQuestionValid).length === 0 ? colors.mediumGray : colors.forestGreen,
                color: colors.white,
                border: 'none',
                padding: '14px 30px',
                borderRadius: '8px',
                cursor: loading || questionForms.filter(isQuestionValid).length === 0 ? 'not-allowed' : 'pointer',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '15px',
                flex: 1,
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                if (!loading && questionForms.filter(isQuestionValid).length > 0) {
                  e.currentTarget.style.backgroundColor = '#3a4220';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading && questionForms.filter(isQuestionValid).length > 0) {
                  e.currentTarget.style.backgroundColor = colors.forestGreen;
                }
              }}
            >
              <FiSave />
              {loading ? 'Processing...' : editQuestionId ? 'Update Question' : `Save All Questions (${questionForms.filter(isQuestionValid).length} valid)`}
            </button>
            
            <button
              type="button"
              onClick={() => navigate(testId && testId !== 'undefined' ? `/teacher/test-creation/${testId}/questions` : '/teacher/questions')}
              style={{
                backgroundColor: '#FFE5E5',
                color: colors.errorRed,
                border: `1px solid ${colors.errorRed}`,
                padding: '14px 30px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '15px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FFD1D1'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FFE5E5'}
            >
              <FiX />
              Cancel
            </button>
          </div>
        </form>
      </div>
      
      {/* Question Preview Modal */}
      {showQuestionPreview !== null && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: colors.white,
            borderRadius: '12px',
            padding: '30px',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            position: 'relative'
          }}>
            <button
              onClick={() => setShowQuestionPreview(null)}
              style={{
                position: 'absolute',
                top: '15px',
                right: '15px',
                backgroundColor: 'transparent',
                border: 'none',
                color: colors.darkGray,
                fontSize: '20px',
                cursor: 'pointer',
                padding: '5px',
                borderRadius: '4px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = colors.forestGreen}
              onMouseLeave={(e) => e.currentTarget.style.color = colors.darkGray}
            >
              <FiX />
            </button>
            
            <h3 style={{ 
              color: colors.forestGreen, 
              marginTop: '0', 
              marginBottom: '20px',
              fontSize: '20px',
              fontWeight: '600'
            }}>
              Question {showQuestionPreview + 1} Preview
            </h3>
            
            <div style={{ 
              backgroundColor: colors.lightGray, 
              padding: '20px', 
              borderRadius: '8px',
              marginBottom: '25px',
              borderLeft: `4px solid ${colors.forestGreen}`
            }}>
              <p style={{ 
                margin: '0', 
                fontSize: '16px',
                lineHeight: '1.6',
                color: colors.forestGreen
              }}>
                {renderPreviewContent(questionForms[showQuestionPreview])}
              </p>
            </div>
            
            <div style={{ marginBottom: '25px' }}>
              <h4 style={{ 
                color: colors.forestGreen, 
                margin: '0 0 15px 0',
                fontSize: '16px',
                fontWeight: '600'
              }}>
                Options
              </h4>
              <div style={{ display: 'grid', gap: '12px' }}>
                {questionForms[showQuestionPreview].options.filter(opt => opt.trim()).map((option, index) => (
                  <div key={index} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    padding: '12px',
                    backgroundColor: colors.white,
                    borderRadius: '8px',
                    border: `1px solid ${colors.mediumGray}`,
                    borderLeft: `4px solid ${questionForms[showQuestionPreview].correctAnswer === option ? colors.successGreen : colors.mediumGray}`
                  }}>
                    <div style={{
                      backgroundColor: colors.forestGreen,
                      color: colors.white,
                      width: '24px',
                      height: '24px',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: '600',
                      fontSize: '12px',
                      marginRight: '12px',
                      flexShrink: 0
                    }}>
                      {String.fromCharCode(65 + index)}
                    </div>
                    <span style={{ 
                      flex: 1, 
                      color: colors.forestGreen,
                      fontSize: '14px'
                    }}>
                      {option}
                    </span>
                    {questionForms[showQuestionPreview].correctAnswer === option && (
                      <div style={{
                        backgroundColor: '#F0FFF4',
                        color: colors.successGreen,
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        flexShrink: 0
                      }}>
                        <FiCheckCircle size={12} />
                        Correct Answer
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingTop: '20px',
              borderTop: `1px solid ${colors.mediumGray}`
            }}>
              <div>
                <div style={{ color: colors.darkGray, fontSize: '13px', marginBottom: '5px' }}>
                  Subject & Class
                </div>
                <div style={{ 
                  color: colors.forestGreen, 
                  fontWeight: '600',
                  fontSize: '14px'
                }}>
                  {questionForms[showQuestionPreview].subject} • {
                    userClasses.find(c => c.id === questionForms[showQuestionPreview].class)?.name || 
                    'Unknown Class'
                  }
                </div>
              </div>
              
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: colors.darkGray, fontSize: '13px', marginBottom: '5px' }}>
                  Marks
                </div>
                <div style={{ 
                  backgroundColor: colors.gold,
                  color: colors.forestGreen,
                  padding: '6px 12px',
                  borderRadius: '20px',
                  fontWeight: '700',
                  fontSize: '14px'
                }}>
                  {questionForms[showQuestionPreview].marks} mark{questionForms[showQuestionPreview].marks !== 1 ? 's' : ''}
                </div>
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '25px' }}>
              <button
                onClick={() => setShowQuestionPreview(null)}
                style={{
                  backgroundColor: colors.forestGreen,
                  color: colors.white,
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '14px',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3a4220'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.forestGreen}
              >
                <FiX />
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddQuestion;