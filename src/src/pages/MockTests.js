import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { ToastContainer } from 'react-toastify';
import {
  FiClock, FiCheckCircle, FiArrowLeft, FiFlag, FiHelpCircle,
  FiBook, FiAlertCircle, FiSave, FiSend,
  FiList, FiChevronLeft, FiChevronRight, FiMaximize, FiZap,
  FiTarget, FiCheck, FiUser, FiHome, FiRefreshCw, FiChevronsRight,
  FiMinimize, FiX, FiPlay, FiPause, FiLock, FiAlertTriangle,
  FiCalendar, FiBarChart2, FiChevronDown, FiChevronUp,
  FiChevronUpCircle, FiChevronDownCircle, FiCheckSquare,
  FiSquare, FiExternalLink, FiCornerDownRight, FiCornerUpLeft,
  FiMessageSquare, FiUploadCloud, FiShield, FiInfo
} from 'react-icons/fi';

const MockTests = () => {
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('');
  const [testStarted, setTestStarted] = useState(false);
  const [testCompleted, setTestCompleted] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(false);
  const [markedQuestions, setMarkedQuestions] = useState([]);
  const [showInstructions, setShowInstructions] = useState(true);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [timeWarning, setTimeWarning] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [progressSaved, setProgressSaved] = useState(true);
  const [navigationMode, setNavigationMode] = useState('standard');
  const [compactMode, setCompactMode] = useState(false);
  
  const questionBodyRef = useRef(null);
  const instructionsContentRef = useRef(null);
  const sidebarRef = useRef(null);

  // Modern Color Palette (Same as TestTaking.js)
  const COLORS = {
    primary: '#4B5320',
    primaryLight: '#5D6522',
    primaryLighter: '#ECFDF5',
    primaryDark: '#3A4019',
    secondary: '#10B981',
    secondaryLight: '#D1FAE5',
    secondaryDark: '#059669',
    accent: '#F59E0B',
    accentLight: '#FEF3C7',
    accentDark: '#D97706',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    info: '#3B82F6',
    white: '#FFFFFF',
    lightGray: '#F9FAFB',
    gray: '#6B7280',
    darkGray: '#374151',
    dark: '#111827',
    border: '#E5E7EB',
    shadow: 'rgba(0, 0, 0, 0.08)',
    overlay: 'rgba(0, 0, 0, 0.45)',
  };

  // Available subjects with WAEC-style questions
  const subjects = [
    { id: 'english', name: 'English Language', icon: '📚', questions: 100, description: 'Grammar, comprehension, and vocabulary' },
    { id: 'mathematics', name: 'Mathematics', icon: '🧮', questions: 120, description: 'Algebra, geometry, and calculus' },
    { id: 'physics', name: 'Physics', icon: '⚛️', questions: 90, description: 'Mechanics, electricity, and waves' },
    { id: 'chemistry', name: 'Chemistry', icon: '🧪', questions: 90, description: 'Organic, inorganic, and physical chemistry' },
    { id: 'biology', name: 'Biology', icon: '🔬', questions: 80, description: 'Botany, zoology, and genetics' },
    { id: 'economics', name: 'Economics', icon: '📈', questions: 80, description: 'Micro and macro economics' },
    { id: 'government', name: 'Government', icon: '🏛️', questions: 70, description: 'Political science and civics' },
    { id: 'geography', name: 'Geography', icon: '🌍', questions: 70, description: 'Physical and human geography' },
    { id: 'computer', name: 'Computer Studies', icon: '💻', questions: 60, description: 'Programming and IT fundamentals' }
  ];

  // Test levels matching WAEC timing
  const levels = [
    { 
      id: 'full-mock', 
      name: 'Full Mock Exam', 
      questions: 60, 
      duration: 120,
      description: 'Complete 60-question exam (2 hours)'
    },
    { 
      id: 'timed-practice', 
      name: 'Timed Practice', 
      questions: 40, 
      duration: 90,
      description: '40 questions with time pressure (1.5 hours)'
    },
    { 
      id: 'quick-test', 
      name: 'Quick Test', 
      questions: 25, 
      duration: 45,
      description: 'Short 25-question test (45 minutes)'
    }
  ];

  // WAEC Past Questions Database
  const questionBanks = {
    english: [
      {
        id: 'eng-001',
        text: 'Choose the option opposite in meaning to the underlined word: "The rather insignificant effort he made yielded ....results"',
        options: ['exorbitant', 'absolute', 'tremendous', 'prohibitive'],
        correctAnswer: 2,
        explanation: '"Insignificant" means small or unimportant. "Tremendous" means very great in amount, scale, or intensity.',
        marks: 1,
        year: 1994,
        topic: 'Antonyms',
        difficulty: 'Medium'
      },
      {
        id: 'eng-002',
        text: 'Choose the option that best completes the sentence: "Neither the students nor the teacher _____ present at the meeting."',
        options: ['was', 'were', 'have been', 'are'],
        correctAnswer: 0,
        explanation: 'When using "neither/nor", the verb agrees with the nearest subject ("teacher" is singular).',
        marks: 1,
        year: 1997,
        topic: 'Grammar',
        difficulty: 'Easy'
      },
      {
        id: 'eng-003',
        text: 'From the words lettered A to D, choose the word that rhymes with the given word: "BOUGH"',
        options: ['bow', 'cough', 'through', 'tough'],
        correctAnswer: 0,
        explanation: '"Bough" rhymes with "bow" (as in bow and arrow).',
        marks: 1,
        year: 2005,
        topic: 'Phonetics',
        difficulty: 'Medium'
      },
      {
        id: 'eng-004',
        text: 'In the following sentence, the word that receives the emphatic stress is written in capital letters. Choose the appropriate answer: "John gave Mary the BOOK yesterday."',
        options: ['Who gave Mary the book yesterday?', 'What did John give Mary yesterday?', 'When did John give Mary the book?', 'Who did John give the book yesterday?'],
        correctAnswer: 1,
        explanation: 'The emphatic stress on "BOOK" indicates the answer should focus on what was given.',
        marks: 1,
        year: 2010,
        topic: 'Stress and Intonation',
        difficulty: 'Hard'
      },
      {
        id: 'eng-005',
        text: 'Choose the option nearest in meaning to the underlined word: "His ascetic lifestyle is admired by many."',
        options: ['luxurious', 'simple', 'extravagant', 'complicated'],
        correctAnswer: 1,
        explanation: '"Ascetic" means characterized by severe self-discipline and abstention from indulgence, typically for religious reasons.',
        marks: 1,
        year: 2015,
        topic: 'Synonyms',
        difficulty: 'Medium'
      },
      {
        id: 'eng-006',
        text: 'Identify the word with a different stress pattern.',
        options: ['Photograph', 'Photographer', 'Photographic', 'Photography'],
        correctAnswer: 3,
        explanation: 'Photography is stressed on the second syllable while others on the first.',
        marks: 1,
        year: 2018,
        topic: 'Stress',
        difficulty: 'Medium'
      },
      {
        id: 'eng-007',
        text: 'Choose the correct interpretation: "He left the company under a cloud."',
        options: ['He resigned happily', 'He was dismissed in disgrace', 'He retired honorably', 'He transferred willingly'],
        correctAnswer: 1,
        explanation: '"Under a cloud" means under suspicion or in disgrace.',
        marks: 1,
        year: 2019,
        topic: 'Idioms',
        difficulty: 'Medium'
      },
      {
        id: 'eng-008',
        text: 'Select the correct spelling.',
        options: ['Accomodation', 'Acommodation', 'Accommodation', 'Acomodation'],
        correctAnswer: 2,
        explanation: 'The correct spelling is "Accommodation" with double "c" and double "m".',
        marks: 1,
        year: 2020,
        topic: 'Spelling',
        difficulty: 'Easy'
      },
      {
        id: 'eng-009',
        text: 'Which sentence is grammatically correct?',
        options: ['Each of the boys have their own book', 'Each of the boys has his own book', 'Each of the boys have his own book', 'Each of the boys has their own book'],
        correctAnswer: 1,
        explanation: '"Each" is singular and requires singular verb "has" and pronoun "his".',
        marks: 1,
        year: 2021,
        topic: 'Grammar',
        difficulty: 'Medium'
      },
      {
        id: 'eng-010',
        text: 'Choose the option that has the same vowel sound as the one represented by the underlined letter: "fOOd"',
        options: ['good', 'stood', 'blood', 'mood'],
        correctAnswer: 3,
        explanation: 'Both "food" and "mood" have the same /uː/ sound.',
        marks: 1,
        year: 2022,
        topic: 'Phonetics',
        difficulty: 'Hard'
      }
    ],
    mathematics: [
      {
        id: 'math-001',
        text: 'A ladder 6m long leans against a vertical wall so that it makes an angle of 60° with the wall. Calculate the distance of the foot of the ladder from the wall.',
        options: ['3m', '6m', '2√3m', '3√3m'],
        correctAnswer: 3,
        explanation: 'Using trigonometry: sin60° = opposite/hypotenuse = x/6m. x = 6 × sin60° = 6 × (√3/2) = 3√3m.',
        marks: 2,
        year: 1994,
        topic: 'Trigonometry',
        difficulty: 'Medium'
      },
      {
        id: 'math-002',
        text: 'The bearing of Q from P is 122°, what is the bearing of P from Q?',
        options: ['212°', '238°', '248°', '302°'],
        correctAnswer: 3,
        explanation: 'Bearing of P from Q = (122° + 180°) mod 360 = 302°',
        marks: 2,
        year: 1994,
        topic: 'Bearings',
        difficulty: 'Easy'
      },
      {
        id: 'math-003',
        text: 'If log₁₀2 = 0.3010, what is log₁₀8?',
        options: ['0.9030', '0.6020', '0.4771', '0.9542'],
        correctAnswer: 0,
        explanation: 'log₁₀8 = log₁₀(2³) = 3 × log₁₀2 = 3 × 0.3010 = 0.9030',
        marks: 2,
        year: 1998,
        topic: 'Logarithms',
        difficulty: 'Medium'
      },
      {
        id: 'math-004',
        text: 'Find the equation of the line passing through points (2,3) and (4,7)',
        options: ['y = 2x - 1', 'y = 2x + 1', 'y = x + 1', 'y = 3x - 3'],
        correctAnswer: 0,
        explanation: 'Slope = (7-3)/(4-2) = 2. Using point-slope: y - 3 = 2(x - 2) => y = 2x - 1',
        marks: 2,
        year: 2002,
        topic: 'Coordinate Geometry',
        difficulty: 'Easy'
      },
      {
        id: 'math-005',
        text: 'Solve the quadratic equation: 2x² - 5x - 3 = 0',
        options: ['x = -1/2, 3', 'x = 1/2, -3', 'x = -1/2, -3', 'x = 1/2, 3'],
        correctAnswer: 0,
        explanation: 'Using quadratic formula: x = [5 ± √(25 + 24)]/4 = [5 ± 7]/4 => x = 3 or x = -1/2',
        marks: 3,
        year: 2005,
        topic: 'Algebra',
        difficulty: 'Medium'
      },
      {
        id: 'math-006',
        text: 'Calculate the area of a circle with diameter 14cm.',
        options: ['154cm²', '616cm²', '308cm²', '77cm²'],
        correctAnswer: 0,
        explanation: 'Radius = 7cm, Area = πr² = (22/7) × 7 × 7 = 154cm²',
        marks: 2,
        year: 2007,
        topic: 'Geometry',
        difficulty: 'Easy'
      },
      {
        id: 'math-007',
        text: 'Simplify: (3√2 + 2√3)(3√2 - 2√3)',
        options: ['6', '18', '12', '0'],
        correctAnswer: 0,
        explanation: 'Using difference of squares: (3√2)² - (2√3)² = 18 - 12 = 6',
        marks: 2,
        year: 2010,
        topic: 'Surds',
        difficulty: 'Medium'
      },
      {
        id: 'math-008',
        text: 'Find the median of: 5, 7, 3, 9, 2, 8, 4',
        options: ['5', '6', '7', '4'],
        correctAnswer: 0,
        explanation: 'Sorted: 2,3,4,5,7,8,9. Median (middle value) = 5',
        marks: 1,
        year: 2013,
        topic: 'Statistics',
        difficulty: 'Easy'
      },
      {
        id: 'math-009',
        text: 'If sinθ = 3/5, find tanθ.',
        options: ['3/4', '4/3', '4/5', '5/4'],
        correctAnswer: 0,
        explanation: 'sinθ = opposite/hypotenuse = 3/5, so adjacent = √(5² - 3²) = 4, tanθ = opposite/adjacent = 3/4',
        marks: 2,
        year: 2016,
        topic: 'Trigonometry',
        difficulty: 'Medium'
      },
      {
        id: 'math-010',
        text: 'Calculate the simple interest on ₦20,000 for 3 years at 5% per annum.',
        options: ['₦3,000', '₦2,000', '₦1,500', '₦4,000'],
        correctAnswer: 0,
        explanation: 'SI = (P × R × T)/100 = (20000 × 5 × 3)/100 = ₦3,000',
        marks: 2,
        year: 2019,
        topic: 'Arithmetic',
        difficulty: 'Easy'
      }
    ],
    physics: [
      {
        id: 'phy-001',
        text: 'Which of the units of the following physical quantities are derived? I. Area II. Thrust III. Pressure IV. Mass',
        options: [
          'I, II, III & IV',
          'I, II, III only',
          'I, II, IV only',
          'I & III only'
        ],
        correctAnswer: 1,
        explanation: 'Derived quantities are obtained from fundamental quantities. Area (m²), Thrust (N), and Pressure (N/m²) are derived. Mass is fundamental.',
        marks: 2,
        year: 'Multiple',
        topic: 'Measurement',
        difficulty: 'Easy'
      },
      {
        id: 'phy-002',
        text: 'A ball of mass 0.5kg moving at 10ms⁻¹ collides with another ball of equal mass at rest. If the two balls move off together after the impact, calculate their common velocity.',
        options: ['0.2ms⁻¹', '0.5ms⁻¹', '5.0ms⁻¹', '10.0ms⁻¹'],
        correctAnswer: 2,
        explanation: 'Using conservation of momentum: m1u1 + m2u2 = (m1+m2)v → 0.5×10 + 0.5×0 = (0.5+0.5)v → 5 = v → v = 5ms⁻¹',
        marks: 3,
        year: 'Multiple',
        topic: 'Momentum',
        difficulty: 'Medium'
      },
      {
        id: 'phy-003',
        text: 'Which of the following is NOT a vector quantity?',
        options: ['Velocity', 'Force', 'Temperature', 'Momentum'],
        correctAnswer: 2,
        explanation: 'Temperature is a scalar quantity as it has only magnitude, no direction.',
        marks: 1,
        year: 2000,
        topic: 'Vectors',
        difficulty: 'Easy'
      },
      {
        id: 'phy-004',
        text: 'A stone is thrown vertically upward with a velocity of 20 m/s. What maximum height will it reach? (g = 10 m/s²)',
        options: ['10m', '20m', '30m', '40m'],
        correctAnswer: 1,
        explanation: 'Using v² = u² - 2gh, at max height v=0: 0 = 400 - 2×10×h → h = 20m',
        marks: 2,
        year: 2003,
        topic: 'Motion',
        difficulty: 'Medium'
      },
      {
        id: 'phy-005',
        text: 'What is the S.I unit of electric current?',
        options: ['Volt', 'Ampere', 'Ohm', 'Watt'],
        correctAnswer: 1,
        explanation: 'The S.I unit of electric current is Ampere (A).',
        marks: 1,
        year: 2008,
        topic: 'Electricity',
        difficulty: 'Easy'
      },
      {
        id: 'phy-006',
        text: 'A lens forms a virtual image when the object is placed:',
        options: ['At focus', 'Between focus and optical center', 'Beyond 2F', 'At 2F'],
        correctAnswer: 1,
        explanation: 'For convex lens, virtual image is formed when object is between focus and optical center.',
        marks: 1,
        year: 2011,
        topic: 'Optics',
        difficulty: 'Medium'
      },
      {
        id: 'phy-007',
        text: 'Which of these is an example of renewable energy?',
        options: ['Natural gas', 'Coal', 'Solar energy', 'Nuclear energy'],
        correctAnswer: 2,
        explanation: 'Solar energy is renewable while others are non-renewable.',
        marks: 1,
        year: 2014,
        topic: 'Energy',
        difficulty: 'Easy'
      },
      {
        id: 'phy-008',
        text: 'The refractive index of water is 1.33. What is the critical angle for water-air interface?',
        options: ['48.8°', '41.8°', '45.0°', '50.0°'],
        correctAnswer: 0,
        explanation: 'sin c = 1/n = 1/1.33 = 0.7519, c = sin⁻¹(0.7519) ≈ 48.8°',
        marks: 2,
        year: 2017,
        topic: 'Refraction',
        difficulty: 'Hard'
      },
      {
        id: 'phy-009',
        text: 'Ohm\'s law states that current is proportional to:',
        options: ['Resistance', 'Voltage', 'Power', 'Energy'],
        correctAnswer: 1,
        explanation: 'Ohm\'s law: V = IR, so I is proportional to V (at constant R).',
        marks: 1,
        year: 2020,
        topic: 'Electricity',
        difficulty: 'Easy'
      },
      {
        id: 'phy-010',
        text: 'Calculate the work done when a force of 20N moves a body 5m in the direction of the force.',
        options: ['100J', '50J', '25J', '4J'],
        correctAnswer: 0,
        explanation: 'Work = Force × Distance = 20N × 5m = 100J',
        marks: 2,
        year: 2021,
        topic: 'Work & Energy',
        difficulty: 'Easy'
      }
    ],
    chemistry: [
      {
        id: 'chem-001',
        text: 'What is the electronic configuration of Calcium (Atomic number 20)?',
        options: [
          '1s² 2s² 2p⁶ 3s² 3p⁶ 4s²',
          '1s² 2s² 2p⁶ 3s² 3p⁶ 3d²',
          '1s² 2s² 2p⁶ 3s² 3p⁶ 4s¹ 3d¹',
          '1s² 2s² 2p⁶ 3s² 3p⁶ 4s² 3d²'
        ],
        correctAnswer: 0,
        explanation: 'Calcium has atomic number 20: 1s² 2s² 2p⁶ 3s² 3p⁶ 4s²',
        marks: 2,
        year: 1995,
        topic: 'Atomic Structure',
        difficulty: 'Medium'
      },
      {
        id: 'chem-002',
        text: 'Which of the following is an example of a covalent compound?',
        options: ['NaCl', 'MgO', 'H₂O', 'CaF₂'],
        correctAnswer: 2,
        explanation: 'H₂O is covalent as it involves sharing of electrons between hydrogen and oxygen.',
        marks: 1,
        year: 1998,
        topic: 'Chemical Bonding',
        difficulty: 'Easy'
      },
      {
        id: 'chem-003',
        text: 'What is the pH of a neutral solution at 25°C?',
        options: ['0', '7', '14', '1'],
        correctAnswer: 1,
        explanation: 'At 25°C, neutral solutions have pH = 7.',
        marks: 1,
        year: 2001,
        topic: 'Acids & Bases',
        difficulty: 'Easy'
      },
      {
        id: 'chem-004',
        text: 'The process of converting solid directly to gas is called:',
        options: ['Sublimation', 'Evaporation', 'Condensation', 'Fusion'],
        correctAnswer: 0,
        explanation: 'Sublimation is the direct conversion from solid to gas without passing through liquid state.',
        marks: 1,
        year: 2004,
        topic: 'States of Matter',
        difficulty: 'Easy'
      },
      {
        id: 'chem-005',
        text: 'Which element has the electron configuration 1s² 2s² 2p⁶ 3s² 3p³?',
        options: ['Phosphorus', 'Nitrogen', 'Sulfur', 'Silicon'],
        correctAnswer: 0,
        explanation: 'Atomic number = 15, which is Phosphorus.',
        marks: 2,
        year: 2007,
        topic: 'Periodic Table',
        difficulty: 'Medium'
      },
      {
        id: 'chem-006',
        text: 'What is the molar mass of H₂SO₄? (H=1, S=32, O=16)',
        options: ['98 g/mol', '64 g/mol', '82 g/mol', '100 g/mol'],
        correctAnswer: 0,
        explanation: 'Molar mass = (2×1) + 32 + (4×16) = 98 g/mol',
        marks: 2,
        year: 2010,
        topic: 'Stoichiometry',
        difficulty: 'Easy'
      },
      {
        id: 'chem-007',
        text: 'Which gas is produced when metals react with acids?',
        options: ['Oxygen', 'Carbon dioxide', 'Hydrogen', 'Nitrogen'],
        correctAnswer: 2,
        explanation: 'Metals + Acids → Salt + Hydrogen gas',
        marks: 1,
        year: 2013,
        topic: 'Reactions',
        difficulty: 'Easy'
      },
      {
        id: 'chem-008',
        text: 'In the periodic table, elements in the same group have:',
        options: ['Same number of shells', 'Same number of electrons', 'Same number of valence electrons', 'Same atomic mass'],
        correctAnswer: 2,
        explanation: 'Elements in the same group have the same number of valence electrons.',
        marks: 1,
        year: 2016,
        topic: 'Periodic Table',
        difficulty: 'Medium'
      },
      {
        id: 'chem-009',
        text: 'What is the oxidation number of oxygen in H₂O₂?',
        options: ['-2', '-1', '+1', '0'],
        correctAnswer: 1,
        explanation: 'In peroxides like H₂O₂, oxygen has oxidation number of -1.',
        marks: 2,
        year: 2019,
        topic: 'Redox',
        difficulty: 'Hard'
      },
      {
        id: 'chem-010',
        text: 'Which of these is an example of an exothermic reaction?',
        options: ['Photosynthesis', 'Burning of wood', 'Melting of ice', 'Evaporation of water'],
        correctAnswer: 1,
        explanation: 'Burning (combustion) releases heat, making it exothermic.',
        marks: 1,
        year: 2022,
        topic: 'Thermochemistry',
        difficulty: 'Medium'
      }
    ],
    biology: [
      {
        id: 'bio-001',
        text: 'Which of the following is NOT a characteristic of living things?',
        options: ['Respiration', 'Reproduction', 'Movement', 'Growth'],
        correctAnswer: 2,
        explanation: 'Movement is not a defining characteristic (e.g., plants are living but don\'t move from place to place).',
        marks: 1,
        year: 1996,
        topic: 'Characteristics of Living Things',
        difficulty: 'Easy'
      },
      {
        id: 'bio-002',
        text: 'Which cell organelle is responsible for protein synthesis?',
        options: ['Mitochondria', 'Ribosome', 'Golgi apparatus', 'Nucleus'],
        correctAnswer: 1,
        explanation: 'Ribosomes are the sites of protein synthesis in cells.',
        marks: 1,
        year: 1999,
        topic: 'Cell Biology',
        difficulty: 'Easy'
      },
      {
        id: 'bio-003',
        text: 'Photosynthesis occurs in which part of the plant cell?',
        options: ['Chloroplast', 'Mitochondria', 'Nucleus', 'Vacuole'],
        correctAnswer: 0,
        explanation: 'Chloroplasts contain chlorophyll and are where photosynthesis occurs.',
        marks: 1,
        year: 2002,
        topic: 'Plant Physiology',
        difficulty: 'Easy'
      },
      {
        id: 'bio-004',
        text: 'Which blood group is the universal donor?',
        options: ['A', 'B', 'AB', 'O'],
        correctAnswer: 3,
        explanation: 'Blood group O negative is the universal donor.',
        marks: 1,
        year: 2005,
        topic: 'Human Biology',
        difficulty: 'Medium'
      },
      {
        id: 'bio-005',
        text: 'DNA is found in which part of the cell?',
        options: ['Cytoplasm', 'Nucleus', 'Cell membrane', 'Ribosome'],
        correctAnswer: 1,
        explanation: 'DNA is located in the nucleus of eukaryotic cells.',
        marks: 1,
        year: 2008,
        topic: 'Genetics',
        difficulty: 'Easy'
      },
      {
        id: 'bio-006',
        text: 'Which of these is a vector-borne disease?',
        options: ['Malaria', 'Tuberculosis', 'Diabetes', 'Hypertension'],
        correctAnswer: 0,
        explanation: 'Malaria is transmitted by mosquitoes (vectors).',
        marks: 1,
        year: 2011,
        topic: 'Health',
        difficulty: 'Easy'
      },
      {
        id: 'bio-007',
        text: 'The process by which plants lose water vapor is called:',
        options: ['Transpiration', 'Photosynthesis', 'Respiration', 'Osmosis'],
        correctAnswer: 0,
        explanation: 'Transpiration is the loss of water vapor from plants.',
        marks: 1,
        year: 2014,
        topic: 'Plant Physiology',
        difficulty: 'Easy'
      },
      {
        id: 'bio-008',
        text: 'Which vitamin is produced when the skin is exposed to sunlight?',
        options: ['Vitamin A', 'Vitamin B12', 'Vitamin C', 'Vitamin D'],
        correctAnswer: 3,
        explanation: 'Vitamin D is synthesized in the skin when exposed to sunlight.',
        marks: 1,
        year: 2017,
        topic: 'Nutrition',
        difficulty: 'Easy'
      },
      {
        id: 'bio-009',
        text: 'The basic unit of heredity is the:',
        options: ['Chromosome', 'Gene', 'Cell', 'Nucleus'],
        correctAnswer: 1,
        explanation: 'Genes are the basic units of heredity.',
        marks: 1,
        year: 2020,
        topic: 'Genetics',
        difficulty: 'Easy'
      },
      {
        id: 'bio-010',
        text: 'Which kingdom do mushrooms belong to?',
        options: ['Plantae', 'Animalia', 'Fungi', 'Protista'],
        correctAnswer: 2,
        explanation: 'Mushrooms are fungi.',
        marks: 1,
        year: 2021,
        topic: 'Classification',
        difficulty: 'Easy'
      }
    ],
    economics: [
      {
        id: 'econ-001',
        text: 'What is the basic economic problem?',
        options: ['Unemployment', 'Inflation', 'Scarcity', 'Poverty'],
        correctAnswer: 2,
        explanation: 'Scarcity refers to limited resources versus unlimited wants.',
        marks: 1,
        year: 1999,
        topic: 'Basic Concepts',
        difficulty: 'Easy'
      },
      {
        id: 'econ-002',
        text: 'Which of these is a factor of production?',
        options: ['Money', 'Land', 'Interest', 'Profit'],
        correctAnswer: 1,
        explanation: 'Factors of production are Land, Labor, Capital, and Entrepreneurship.',
        marks: 1,
        year: 2002,
        topic: 'Production',
        difficulty: 'Easy'
      },
      {
        id: 'econ-003',
        text: 'The total value of goods and services produced in a country in a year is called:',
        options: ['Net National Product', 'Gross Domestic Product', 'National Income', 'Per Capita Income'],
        correctAnswer: 1,
        explanation: 'GDP is the total value of goods and services produced within a country in a year.',
        marks: 1,
        year: 2005,
        topic: 'National Income',
        difficulty: 'Medium'
      },
      {
        id: 'econ-004',
        text: 'When demand increases and supply remains constant, what happens to price?',
        options: ['Price decreases', 'Price increases', 'Price remains same', 'Price becomes zero'],
        correctAnswer: 1,
        explanation: 'Increased demand with constant supply leads to higher prices.',
        marks: 1,
        year: 2008,
        topic: 'Demand & Supply',
        difficulty: 'Easy'
      },
      {
        id: 'econ-005',
        text: 'Which of these is a direct tax?',
        options: ['Sales tax', 'Value Added Tax', 'Income tax', 'Excise duty'],
        correctAnswer: 2,
        explanation: 'Income tax is paid directly to the government by individuals.',
        marks: 1,
        year: 2011,
        topic: 'Taxation',
        difficulty: 'Medium'
      },
      {
        id: 'econ-006',
        text: 'Monetary policy is controlled by the:',
        options: ['Ministry of Finance', 'Central Bank', 'Commercial Banks', 'Stock Exchange'],
        correctAnswer: 1,
        explanation: 'Central banks control monetary policy.',
        marks: 1,
        year: 2014,
        topic: 'Money & Banking',
        difficulty: 'Medium'
      },
      {
        id: 'econ-007',
        text: 'When a country exports more than it imports, it has a:',
        options: ['Trade deficit', 'Budget surplus', 'Trade surplus', 'Balance of payments'],
        correctAnswer: 2,
        explanation: 'Trade surplus occurs when exports exceed imports.',
        marks: 1,
        year: 2017,
        topic: 'International Trade',
        difficulty: 'Medium'
      },
      {
        id: 'econ-008',
        text: 'Which economic system allows private ownership of resources?',
        options: ['Socialism', 'Communism', 'Capitalism', 'Mixed economy'],
        correctAnswer: 2,
        explanation: 'Capitalism features private ownership of resources.',
        marks: 1,
        year: 2020,
        topic: 'Economic Systems',
        difficulty: 'Easy'
      },
      {
        id: 'econ-009',
        text: 'Inflation refers to:',
        options: ['Increase in money supply', 'Decrease in prices', 'General increase in prices', 'Increase in exports'],
        correctAnswer: 2,
        explanation: 'Inflation is a sustained increase in the general price level.',
        marks: 1,
        year: 2021,
        topic: 'Inflation',
        difficulty: 'Easy'
      },
      {
        id: 'econ-010',
        text: 'Which organization provides loans to developing countries?',
        options: ['WTO', 'IMF', 'World Bank', 'UN'],
        correctAnswer: 2,
        explanation: 'World Bank provides development loans to countries.',
        marks: 1,
        year: 2022,
        topic: 'International Organizations',
        difficulty: 'Medium'
      }
    ]
  };

  // Generate questions based on subject and level
  const generateQuestions = (subject, level) => {
    const levelConfig = levels.find(l => l.id === level);
    const questionCount = levelConfig?.questions || 60;
    
    const bank = questionBanks[subject] || [];
    const generatedQuestions = [];
    
    // If we have enough questions in bank, use them
    if (bank.length >= questionCount) {
      // Randomly select questions from bank
      const shuffled = [...bank].sort(() => Math.random() - 0.5);
      for (let i = 0; i < questionCount; i++) {
        generatedQuestions.push({
          ...shuffled[i],
          id: `${subject}-${i}`
        });
      }
    } else {
      // Use available questions and generate more if needed
      for (let i = 0; i < questionCount; i++) {
        if (i < bank.length) {
          generatedQuestions.push({
            ...bank[i],
            id: `${subject}-${i}`
          });
        } else {
          // Fallback to generated questions
          generatedQuestions.push(generateFallbackQuestion(subject, i));
        }
      }
    }
    
    return generatedQuestions;
  };

  // Fallback question generator
  const generateFallbackQuestion = (subject, index) => {
    const fallbackQuestions = {
      english: {
        text: `Choose the correct option: "She ____ to school every day."`,
        options: ['go', 'goes', 'going', 'went'],
        correctAnswer: 1,
        explanation: 'Present simple tense for habitual action with singular subject.'
      },
      mathematics: {
        text: `What is 15% of 200?`,
        options: ['15', '20', '30', '45'],
        correctAnswer: 2,
        explanation: '15% of 200 = 0.15 × 200 = 30'
      },
      physics: {
        text: 'What is the formula for force?',
        options: ['F = ma', 'F = mv', 'F = m/a', 'F = a/m'],
        correctAnswer: 0,
        explanation: 'Newton\'s second law: Force = mass × acceleration'
      }
    };
    
    const defaultQ = {
      text: `Sample question ${index + 1}`,
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correctAnswer: 0,
      explanation: 'Sample explanation',
      marks: 1,
      year: '2023',
      topic: 'General',
      difficulty: 'Medium'
    };
    
    return {
      id: `${subject}-fallback-${index}`,
      ...(fallbackQuestions[subject] || defaultQ)
    };
  };

  // Timer management
  useEffect(() => {
    if (testStarted && !testCompleted && timeLeft > 0 && !isPaused) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 300) setTimeWarning(true);
          if (prev <= 1) {
            handleAutoSubmit();
            return 0;
          }
          return prev - 1;
        });
        setElapsedTime(prev => prev + 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [testStarted, testCompleted, timeLeft, isPaused]);

  // Start test
  const startTest = () => {
    if (!selectedSubject || !selectedLevel) {
      toast.error('Please select both subject and test type', { position: 'top-right', autoClose: 3000 });
      return;
    }

    setLoading(true);
    
    // Generate questions
    const generatedQuestions = generateQuestions(selectedSubject, selectedLevel);
    setQuestions(generatedQuestions);
    
    // Set timer
    const duration = levels.find(l => l.id === selectedLevel)?.duration || 120;
    setTimeLeft(duration * 60);
    
    setTestStarted(true);
    setTestCompleted(false);
    setCurrentQuestion(0);
    setAnswers({});
    setScore(0);
    setMarkedQuestions([]);
    setShowInstructions(false);
    
    setTimeout(() => setLoading(false), 500);
  };

  // Handle answer selection
  const handleAnswerSelect = (questionId, optionIndex) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: optionIndex
    }));
    setProgressSaved(false);
  };

  // Toggle mark question
  const toggleMarkQuestion = (index) => {
    setMarkedQuestions(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  // Get question status
  const getQuestionStatus = (index) => {
    const question = questions[index];
    if (!question) return 'unanswered';
    if (answers[question.id] !== undefined) return 'answered';
    if (markedQuestions.includes(index)) return 'marked';
    return 'unanswered';
  };

  // Submit test
  const submitTest = () => {
    let calculatedScore = 0;
    const results = [];
    
    questions.forEach(question => {
      const userAnswer = answers[question.id];
      const isCorrect = userAnswer === question.correctAnswer;
      
      if (isCorrect) {
        calculatedScore += question.marks || 1;
      }
      
      results.push({
        ...question,
        userAnswer,
        isCorrect
      });
    });
    
    setScore(calculatedScore);
    setTestCompleted(true);
    setQuestions(results);
    setShowConfirmation(false);
  };

  const handleAutoSubmit = () => {
    if (window.confirm('Time is up! Your test will be submitted automatically.')) {
      submitTest();
    } else {
      submitTest();
    }
  };

  // Format time
  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Restart test
  const restartTest = () => {
    setTestStarted(false);
    setTestCompleted(false);
    setSelectedSubject('');
    setSelectedLevel('');
    setQuestions([]);
    setCurrentQuestion(0);
    setAnswers({});
    setTimeLeft(0);
    setScore(0);
    setMarkedQuestions([]);
    setShowInstructions(true);
  };

  // Take another test
  const takeAnotherTest = () => {
    setTestStarted(false);
    setTestCompleted(false);
    setQuestions([]);
    setCurrentQuestion(0);
    setAnswers({});
    setTimeLeft(0);
    setScore(0);
    setMarkedQuestions([]);
    setSelectedSubject('');
    setSelectedLevel('');
  };

  // Fullscreen handling
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  // Get progress statistics
  const getProgressStats = () => {
    const answered = Object.keys(answers).length;
    const total = questions.length;
    const percentage = total > 0 ? Math.round((answered / total) * 100) : 0;
    
    return {
      answered,
      total,
      percentage,
      marked: markedQuestions.length,
      remaining: total - answered
    };
  };

  // Navigate to question
  const navigateToQuestion = (index) => {
    setCurrentQuestion(index);
    if (navigationMode === 'review') {
      setNavigationMode('standard');
    }
  };

  // Get filtered questions for sidebar
  const getFilteredQuestions = () => {
    switch (navigationMode) {
      case 'marked':
        return markedQuestions;
      case 'review':
        return questions
          .map((q, idx) => ({ idx, status: getQuestionStatus(idx) }))
          .filter(q => q.status === 'answered' || markedQuestions.includes(q.idx))
          .map(q => q.idx);
      default:
        return questions.map((_, idx) => idx);
    }
  };

  // Save progress
  const saveProgress = () => {
    // Simulate save progress
    setProgressSaved(true);
    toast.success('Progress saved', { position: 'top-right', autoClose: 2000 });
  };

  // Helper function to reduce font size by 6%
  const reduceFontSize = (size) => {
    return `calc(${size} * 0.94)`;
  };

  // Button styles (same as TestTaking.js)
  const buttonStyles = {
    primary: {
      display: 'flex',
      alignItems: 'center',
      gap: '7px',
      padding: '9px 18px',
      background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryDark} 100%)`,
      color: COLORS.white,
      border: 'none',
      borderRadius: '8px',
      fontWeight: '600',
      fontSize: '11px', // Reduced by 6% from 12px
      cursor: 'pointer',
      transition: 'all 0.2s',
      '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: '0 5px 14px rgba(75, 83, 32, 0.2)',
      },
      '&:disabled': {
        opacity: 0.6,
        cursor: 'not-allowed',
        transform: 'none',
      },
    },
    secondary: {
      display: 'flex',
      alignItems: 'center',
      gap: '7px',
      padding: '9px 18px',
      backgroundColor: COLORS.white,
      border: `1px solid ${COLORS.primary}`,
      color: COLORS.primary,
      borderRadius: '8px',
      fontWeight: '600',
      fontSize: '11px', // Reduced by 6% from 12px
      cursor: 'pointer',
      transition: 'all 0.2s',
      '&:hover': {
        backgroundColor: `${COLORS.primary}10`,
        transform: 'translateY(-2px)',
      },
      '&:disabled': {
        opacity: 0.6,
        cursor: 'not-allowed',
        transform: 'none',
      },
    },
    danger: {
      display: 'flex',
      alignItems: 'center',
      gap: '7px',
      padding: '9px 18px',
      background: `linear-gradient(135deg, ${COLORS.danger} 0%, #DC2626 100%)`,
      color: COLORS.white,
      border: 'none',
      borderRadius: '8px',
      fontWeight: '600',
      fontSize: '11px', // Reduced by 6% from 12px
      cursor: 'pointer',
      transition: 'all 0.2s',
      '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: '0 5px 14px rgba(239, 68, 68, 0.2)',
      },
    },
  };

  // Styles matching TestTaking.js
  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: COLORS.lightGray,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      display: 'flex',
      flexDirection: 'column',
    },

    // Loading Screen
    loadingScreen: {
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryDark} 100%)`,
    },
    loadingContent: {
      textAlign: 'center',
      color: COLORS.white,
    },
    spinner: {
      width: '50px',
      height: '50px',
      border: '2px solid rgba(255,255,255,0.3)',
      borderTopColor: COLORS.white,
      borderRadius: '50%',
      animation: 'spin 1s linear infinite',
      margin: '0 auto 20px',
    },
    loadingTitle: {
      fontSize: '17px', // Reduced by 6% from 18px
      fontWeight: '600',
      marginBottom: '10px',
    },

    // Instructions Modal
    instructionsModal: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: COLORS.overlay,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px',
      backdropFilter: 'blur(5px)',
    },
    instructionsContent: {
      maxWidth: '720px',
      width: '100%',
      maxHeight: '80vh',
      backgroundColor: COLORS.white,
      borderRadius: '16px',
      overflow: 'hidden',
      boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
      display: 'flex',
      flexDirection: 'column',
    },
    instructionsHeader: {
      padding: '25px 30px',
      background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryDark} 100%)`,
      color: COLORS.white,
      flexShrink: 0,
    },
    instructionsTitle: {
      fontSize: '19px', // Reduced by 6% from 20px
      fontWeight: '700',
      marginBottom: '5px',
    },
    instructionsSubtitle: {
      fontSize: '13px', // Reduced by 6% from 14px
      opacity: 0.9,
    },
    instructionsBody: {
      padding: '25px 30px',
      overflowY: 'auto',
      flex: 1,
    },
    instructionsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
      gap: '15px',
      marginBottom: '25px',
    },
    instructionCard: {
      padding: '20px',
      backgroundColor: COLORS.lightGray,
      borderRadius: '12px',
      textAlign: 'center',
      transition: 'transform 0.2s',
      cursor: 'default',
      '&:hover': {
        transform: 'translateY(-2px)',
      },
    },
    instructionIcon: {
      width: '50px',
      height: '50px',
      margin: '0 auto 15px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: '50%',
      fontSize: '20px',
    },
    instructionTitle: {
      fontSize: '13px', // Reduced by 6% from 14px
      fontWeight: '600',
      marginBottom: '5px',
      color: COLORS.dark,
    },
    guidelinesSection: {
      backgroundColor: COLORS.lightGray,
      padding: '20px',
      borderRadius: '12px',
      marginBottom: '20px',
    },
    guidelinesTitle: {
      fontSize: '15px', // Reduced by 6% from 16px
      fontWeight: '600',
      color: COLORS.primary,
      marginBottom: '15px',
    },
    guidelinesList: {
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
    },
    guidelineItem: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: '10px',
      color: COLORS.darkGray,
      fontSize: '12px', // Reduced by 6% from 13px
    },
    guidelineIcon: {
      color: COLORS.secondary,
      flexShrink: 0,
      marginTop: '2px',
    },
    warningSection: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: '12px',
      padding: '15px',
      backgroundColor: `${COLORS.warning}10`,
      border: `1px solid ${COLORS.warning}`,
      borderRadius: '12px',
      color: COLORS.warning,
      marginTop: '20px',
      fontSize: '12px', // Reduced by 6% from 13px
    },
    instructionsFooter: {
      padding: '20px 30px',
      borderTop: `1px solid ${COLORS.border}`,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexShrink: 0,
    },

    // Header
    header: {
      backgroundColor: COLORS.white,
      padding: '15px 25px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '20px',
    },
    headerLeft: {
      display: 'flex',
      alignItems: 'center',
      gap: '15px',
      flex: 1,
    },
    backButton: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 15px',
      backgroundColor: COLORS.lightGray,
      border: `1px solid ${COLORS.border}`,
      borderRadius: '8px',
      color: COLORS.primary,
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.2s',
      fontSize: '12px', // Reduced by 6% from 13px
      '&:hover': {
        backgroundColor: `${COLORS.primary}10`,
      },
    },
    testInfo: {
      flex: 1,
    },
    testTitle: {
      fontSize: '15px', // Reduced by 6% from 16px
      fontWeight: '600',
      color: COLORS.dark,
      marginBottom: '5px',
    },
    testMeta: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '10px',
      fontSize: '11px', // Reduced by 6% from 12px
      color: COLORS.gray,
    },
    metaItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '5px',
      padding: '4px 10px',
      backgroundColor: COLORS.lightGray,
      borderRadius: '12px',
    },
    timerSection: {
      display: 'flex',
      alignItems: 'center',
      gap: '15px',
    },
    timerCard: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '10px 20px',
      background: timeWarning ? `linear-gradient(135deg, ${COLORS.warning} 0%, ${COLORS.accentDark} 100%)` : `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryDark} 100%)`,
      color: COLORS.white,
      borderRadius: '10px',
      fontWeight: '600',
      minWidth: '120px',
      fontSize: '13px', // Reduced by 6% from 14px
      position: 'relative',
      overflow: 'hidden',
    },
    timerWarning: {
      position: 'absolute',
      top: '-6px',
      left: '50%',
      transform: 'translateX(-50%)',
      backgroundColor: COLORS.warning,
      color: COLORS.white,
      padding: '3px 8px',
      borderRadius: '6px',
      fontSize: '9px', // Reduced by 6% from 10px
      fontWeight: '600',
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      whiteSpace: 'nowrap',
      animation: 'pulse 1.5s infinite',
    },
    headerControls: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    controlButton: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '36px',
      height: '36px',
      backgroundColor: COLORS.lightGray,
      border: `1px solid ${COLORS.border}`,
      borderRadius: '8px',
      color: COLORS.primary,
      cursor: 'pointer',
      transition: 'all 0.2s',
      fontSize: '16px',
      '&:hover': {
        backgroundColor: `${COLORS.primary}10`,
      },
    },

    // Main Content
    mainContent: {
      flex: 1,
      display: 'flex',
      padding: '20px',
      gap: '20px',
      maxWidth: '1400px',
      margin: '0 auto',
      width: '100%',
      height: 'calc(100vh - 140px)',
      minHeight: 'calc(100vh - 140px)',
      overflow: 'hidden',
    },
    questionArea: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      gap: '15px',
      minWidth: 0,
      height: '100%',
    },
    questionCard: {
      flex: 1,
      backgroundColor: COLORS.white,
      borderRadius: '12px',
      boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100% - 70px)',
    },
    questionHeader: {
      padding: '20px 25px',
      borderBottom: `1px solid ${COLORS.border}`,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: COLORS.lightGray,
      flexShrink: 0,
    },
    questionNav: {
      display: 'flex',
      alignItems: 'center',
      gap: '15px',
    },
    questionNumber: {
      fontSize: '15px', // Reduced by 6% from 16px
      fontWeight: '600',
      color: COLORS.primary,
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    questionTotal: {
      fontSize: '12px', // Reduced by 6% from 13px
      color: COLORS.gray,
      fontWeight: '500',
    },
    questionActions: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
    },
    actionButton: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      padding: '6px 12px',
      backgroundColor: 'transparent',
      border: `1px solid ${COLORS.border}`,
      borderRadius: '8px',
      color: COLORS.darkGray,
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'all 0.2s',
      fontSize: '11px', // Reduced by 6% from 12px
      '&:hover': {
        backgroundColor: COLORS.lightGray,
      },
    },
    questionBody: {
      flex: 1,
      padding: '30px',
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column',
    },
    questionText: {
      fontSize: '17px', // Reduced by 6% from 18px
      lineHeight: 1.6,
      color: COLORS.dark,
      marginBottom: '25px',
      fontWeight: '500',
      flexShrink: 0,
    },
    optionsGrid: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      gap: '15px',
      maxHeight: 'calc(100% - 60px)',
      overflowY: 'auto',
    },
    optionItem: {
      display: 'flex',
      alignItems: 'center',
      padding: '18px',
      border: `2px solid ${COLORS.border}`,
      borderRadius: '10px',
      cursor: 'pointer',
      transition: 'all 0.2s',
      backgroundColor: COLORS.white,
      flexShrink: 0,
      minHeight: '60px',
      '&:hover': {
        borderColor: COLORS.primary,
        transform: 'translateY(-1px)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
      },
    },
    optionLetter: {
      width: '32px',
      height: '32px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: '8px',
      backgroundColor: COLORS.lightGray,
      color: COLORS.darkGray,
      fontWeight: '600',
      fontSize: '14px',
      marginRight: '15px',
      flexShrink: 0,
      transition: 'all 0.2s',
    },
    optionText: {
      flex: 1,
      fontSize: '14px', // Reduced by 6% from 15px
      lineHeight: 1.5,
      color: COLORS.darkGray,
      wordBreak: 'break-word',
    },
    optionCheck: {
      marginLeft: '10px',
      color: COLORS.success,
      fontSize: '18px',
      flexShrink: 0,
    },
    navigationButtons: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '15px 20px',
      backgroundColor: COLORS.white,
      borderRadius: '12px',
      boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
      flexShrink: 0,
      marginTop: 'auto',
    },
    pageIndicator: {
      fontSize: '13px', // Reduced by 6% from 14px
      color: COLORS.gray,
      fontWeight: '500',
    },

    // Sidebar - UPDATED to be self-contained card
    sidebarContainer: {
      width: '320px',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
    },
    sidebarCard: {
      flex: 1,
      backgroundColor: COLORS.white,
      borderRadius: '12px',
      boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      height: '100%',
    },
    sidebarHeader: {
      padding: '20px 25px',
      borderBottom: `1px solid ${COLORS.border}`,
      backgroundColor: COLORS.lightGray,
      flexShrink: 0,
    },
    sidebarTitle: {
      fontSize: '15px', // Reduced by 6% from 16px
      fontWeight: '600',
      color: COLORS.primary,
      marginBottom: '15px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    filterTabs: {
      display: 'flex',
      gap: '8px',
      marginBottom: '15px',
    },
    filterTab: {
      flex: 1,
      padding: '8px',
      textAlign: 'center',
      backgroundColor: COLORS.white,
      border: `1px solid ${COLORS.border}`,
      borderRadius: '6px',
      fontSize: '10px', // Reduced by 6% from 11px
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'all 0.2s',
    },
    questionsGridContainer: {
      flex: 1,
      padding: '15px',
      overflowY: 'auto',
      minHeight: '0',
    },
    questionsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(40px, 1fr))',
      gap: '8px',
    },
    gridButton: {
      position: 'relative',
      width: '100%',
      aspectRatio: '1',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: '8px',
      border: `1px solid ${COLORS.border}`,
      backgroundColor: COLORS.white,
      color: COLORS.darkGray,
      fontWeight: '600',
      fontSize: '12px', // Reduced by 6% from 13px
      cursor: 'pointer',
      transition: 'all 0.2s',
      overflow: 'hidden',
      '&:hover': {
        transform: 'scale(1.05)',
        boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
      },
    },
    flagIndicator: {
      position: 'absolute',
      top: '3px',
      right: '3px',
      fontSize: '10px',
      color: COLORS.accent,
    },
    sidebarFooter: {
      padding: '20px',
      borderTop: `1px solid ${COLORS.border}`,
      backgroundColor: COLORS.lightGray,
      flexShrink: 0,
    },
    legend: {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
    },
    legendItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: '11px', // Reduced by 6% from 12px
      color: COLORS.gray,
    },
    legendDot: {
      width: '10px',
      height: '10px',
      borderRadius: '3px',
      flexShrink: 0,
    },

    // Footer
    footer: {
      padding: '15px 25px',
      backgroundColor: COLORS.white,
      borderTop: `1px solid ${COLORS.border}`,
      boxShadow: '0 -2px 8px rgba(0,0,0,0.04)',
      position: 'sticky',
      bottom: 0,
      zIndex: 99,
    },
    footerContent: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      maxWidth: '1400px',
      margin: '0 auto',
    },
    progressStats: {
      display: 'flex',
      alignItems: 'center',
      gap: '20px',
    },
    statItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: '12px', // Reduced by 6% from 13px
      color: COLORS.darkGray,
    },
    statBadge: {
      width: '28px',
      height: '28px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: '6px',
      fontWeight: '600',
      fontSize: '11px', // Reduced by 6% from 12px
    },
    footerActions: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
    },
    footerButton: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      padding: '8px 16px',
      backgroundColor: COLORS.lightGray,
      border: `1px solid ${COLORS.border}`,
      borderRadius: '8px',
      color: COLORS.primary,
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.2s',
      fontSize: '11px', // Reduced by 6% from 12px
      '&:hover': {
        backgroundColor: `${COLORS.primary}10`,
        transform: 'translateY(-1px)',
      },
    },
    submitButton: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '10px 24px',
      background: `linear-gradient(135deg, ${COLORS.success} 0%, ${COLORS.secondaryDark} 100%)`,
      color: COLORS.white,
      border: 'none',
      borderRadius: '10px',
      fontWeight: '600',
      fontSize: '13px', // Reduced by 6% from 14px
      cursor: 'pointer',
      transition: 'all 0.2s',
      '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: '0 6px 20px rgba(16, 185, 129, 0.3)',
      },
    },

    // Confirmation Modal
    confirmationModal: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: COLORS.overlay,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px',
      backdropFilter: 'blur(5px)',
    },
    confirmationContent: {
      maxWidth: '500px',
      width: '100%',
      backgroundColor: COLORS.white,
      borderRadius: '16px',
      overflow: 'hidden',
      boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
    },
    confirmationHeader: {
      padding: '25px 25px 20px',
      textAlign: 'center',
    },
    confirmationIcon: {
      margin: '0 auto 20px',
      color: COLORS.warning,
    },
    confirmationTitle: {
      fontSize: '19px', // Reduced by 6% from 20px
      fontWeight: '600',
      color: COLORS.dark,
      marginBottom: '10px',
    },
    confirmationText: {
      fontSize: '13px', // Reduced by 6% from 14px
      color: COLORS.gray,
      lineHeight: 1.5,
    },
    confirmationStats: {
      padding: '20px 25px',
      backgroundColor: COLORS.lightGray,
    },
    statsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '15px',
    },
    statCard: {
      backgroundColor: COLORS.white,
      padding: '20px',
      borderRadius: '10px',
      textAlign: 'center',
      boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    },
    statValue: {
      fontSize: '19px', // Reduced by 6% from 20px
      fontWeight: '700',
      color: COLORS.primary,
      marginBottom: '5px',
    },
    statLabel: {
      fontSize: '10px', // Reduced by 6% from 11px
      color: COLORS.gray,
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      fontWeight: '600',
    },
    confirmationFooter: {
      padding: '20px 25px',
      borderTop: `1px solid ${COLORS.border}`,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },

    // Pause Overlay
    pauseOverlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: COLORS.overlay,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      backdropFilter: 'blur(5px)',
    },
    pauseModal: {
      padding: '30px',
      backgroundColor: COLORS.white,
      borderRadius: '16px',
      textAlign: 'center',
      boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
      maxWidth: '400px',
      width: '100%',
    },
    pauseIcon: {
      margin: '0 auto 20px',
      color: COLORS.primary,
    },
    pauseTitle: {
      fontSize: '19px', // Reduced by 6% from 20px
      fontWeight: '600',
      color: COLORS.dark,
      marginBottom: '10px',
    },
    pauseText: {
      fontSize: '13px', // Reduced by 6% from 14px
      color: COLORS.gray,
      marginBottom: '25px',
    },

    // Summary Panel
    summaryPanel: {
      marginTop: '15px',
      backgroundColor: COLORS.white,
      borderRadius: '12px',
      padding: '20px',
      boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
      border: `1px solid ${COLORS.border}`,
    },
    summaryHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '20px',
    },
    summaryTitle: {
      fontSize: '15px', // Reduced by 6% from 16px
      fontWeight: '600',
      color: COLORS.primary,
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    summaryStats: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
      gap: '15px',
    },
    summaryCard: {
      backgroundColor: COLORS.lightGray,
      padding: '15px',
      borderRadius: '10px',
      textAlign: 'center',
      transition: 'transform 0.2s',
      '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      },
    },
    summaryValue: {
      fontSize: '19px', // Reduced by 6% from 20px
      fontWeight: '700',
      color: COLORS.primary,
      marginBottom: '5px',
    },
    summaryLabel: {
      fontSize: '10px', // Reduced by 6% from 11px
      color: COLORS.gray,
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      fontWeight: '600',
    },
  };

  // UI Components

  const LoadingScreen = () => (
    <div style={styles.loadingScreen}>
      <div style={styles.loadingContent}>
        <div style={styles.spinner}></div>
        <h2 style={styles.loadingTitle}>Loading Test...</h2>
        <p style={styles.loadingText}>Preparing your practice environment</p>
      </div>
    </div>
  );

  const InstructionsModal = () => {
    const instructionCards = [
      {
        icon: <FiClock />,
        title: 'Duration',
        text: `${levels.find(l => l.id === selectedLevel)?.duration || 120} minutes`,
        color: COLORS.primary,
      },
      {
        icon: <FiBook />,
        title: 'Questions',
        text: `${levels.find(l => l.id === selectedLevel)?.questions || 60} total`,
        color: COLORS.secondary,
      },
      {
        icon: <FiFlag />,
        title: 'Mark for Review',
        text: 'Flag questions to review later',
        color: COLORS.accent,
      },
      {
        icon: <FiSave />,
        title: 'Auto-save',
        text: 'Progress saved automatically',
        color: COLORS.success,
      },
    ];

    return (
      <div style={styles.instructionsModal}>
        <div style={styles.instructionsContent}>
          <div style={styles.instructionsHeader}>
            <h2 style={styles.instructionsTitle}>{subjects.find(s => s.id === selectedSubject)?.name} Practice Test</h2>
            <p style={styles.instructionsSubtitle}>Practice Test Instructions</p>
          </div>
          <div 
            ref={instructionsContentRef}
            style={styles.instructionsBody}
          >
            <div style={styles.instructionsGrid}>
              {instructionCards.map((card, index) => (
                <div key={index} style={styles.instructionCard}>
                  <div style={{
                    ...styles.instructionIcon,
                    backgroundColor: `${card.color}15`,
                    color: card.color,
                  }}>
                    {card.icon}
                  </div>
                  <h3 style={styles.instructionTitle}>{card.title}</h3>
                  <p style={styles.instructionText}>{card.text}</p>
                </div>
              ))}
            </div>
            <div style={styles.guidelinesSection}>
              <h3 style={styles.guidelinesTitle}>Test Guidelines</h3>
              <div style={styles.guidelinesList}>
                <div style={styles.guidelineItem}>
                  <FiCheckCircle style={styles.guidelineIcon} />
                  <span>Read each question carefully before answering</span>
                </div>
                <div style={styles.guidelineItem}>
                  <FiCheckCircle style={styles.guidelineIcon} />
                  <span>You can navigate between questions freely</span>
                </div>
                <div style={styles.guidelineItem}>
                  <FiCheckCircle style={styles.guidelineIcon} />
                  <span>Mark questions for review if unsure</span>
                </div>
                <div style={styles.guidelineItem}>
                  <FiCheckCircle style={styles.guidelineIcon} />
                  <span>Submit only when you're ready</span>
                </div>
                <div style={styles.guidelineItem}>
                  <FiCheckCircle style={styles.guidelineIcon} />
                  <span>Timer will auto-submit when time expires</span>
                </div>
              </div>
            </div>
            <div style={styles.warningSection}>
              <FiAlertTriangle size={16} />
              <div>
                <strong>Important:</strong> Do not refresh the page during the test.
                Use the mark feature to flag questions you want to review.
              </div>
            </div>
          </div>
          <div style={styles.instructionsFooter}>
            <button style={buttonStyles.secondary} onClick={() => {
              setShowInstructions(false);
              setTestStarted(false);
            }}>
              <FiArrowLeft /> Cancel
            </button>
            <button style={buttonStyles.primary} onClick={() => setShowInstructions(false)}>
              <FiPlay /> Begin Test
            </button>
          </div>
        </div>
      </div>
    );
  };

  const ConfirmationModal = () => {
    const stats = getProgressStats();
    
    return (
      <div style={styles.confirmationModal}>
        <div style={styles.confirmationContent}>
          <div style={styles.confirmationHeader}>
            <FiAlertTriangle size={40} style={styles.confirmationIcon} />
            <h2 style={styles.confirmationTitle}>Submit Test?</h2>
            <p style={styles.confirmationText}>
              Are you sure you want to submit your test? This action cannot be undone.
            </p>
          </div>
          <div style={styles.confirmationStats}>
            <div style={styles.statsGrid}>
              <div style={styles.statCard}>
                <div style={styles.statValue}>{stats.answered}</div>
                <div style={styles.statLabel}>Answered</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statValue}>{stats.marked}</div>
                <div style={styles.statLabel}>Marked</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statValue}>{stats.remaining}</div>
                <div style={styles.statLabel}>Pending</div>
              </div>
            </div>
          </div>
          <div style={styles.confirmationFooter}>
            <button 
              style={buttonStyles.secondary} 
              onClick={() => setShowConfirmation(false)}
            >
              <FiX /> Cancel
            </button>
            <button 
              style={buttonStyles.danger} 
              onClick={submitTest}
            >
              <FiSend /> Submit Test
            </button>
          </div>
        </div>
      </div>
    );
  };

  const PauseOverlay = () => (
    <div style={styles.pauseOverlay}>
      <div style={styles.pauseModal}>
        <FiLock size={40} style={styles.pauseIcon} />
        <h2 style={styles.pauseTitle}>Test Paused</h2>
        <p style={styles.pauseText}>
          Your test timer has been paused. You can resume when ready.
        </p>
        <button style={buttonStyles.primary} onClick={() => setIsPaused(false)}>
          <FiPlay /> Resume Test
        </button>
      </div>
    </div>
  );

  const QuestionDisplay = () => {
    const question = questions[currentQuestion];
    if (!question) return null;

    const status = getQuestionStatus(currentQuestion);
    const isMarked = markedQuestions.includes(currentQuestion);
    const selectedAnswer = answers[question.id];

    return (
      <div style={styles.questionCard}>
        <div style={styles.questionHeader}>
          <div style={styles.questionNav}>
            <div style={styles.questionNumber}>
              Question {currentQuestion + 1}
              <span style={styles.questionTotal}>/{questions.length}</span>
            </div>
            <div style={{
              padding: '4px 10px',
              backgroundColor: status === 'answered' ? `${COLORS.success}15` : 
                             status === 'marked' ? `${COLORS.accent}15` : `${COLORS.gray}15`,
              color: status === 'answered' ? COLORS.success : 
                     status === 'marked' ? COLORS.accent : COLORS.gray,
              borderRadius: '6px',
              fontSize: '10px', // Reduced by 6% from 11px
              fontWeight: '600',
              textTransform: 'uppercase',
            }}>
              {status}
            </div>
          </div>
          <div style={styles.questionActions}>
            <button
              style={styles.actionButton}
              onClick={() => toggleMarkQuestion(currentQuestion)}
            >
              <FiFlag color={isMarked ? COLORS.accent : COLORS.gray} />
              {isMarked ? 'Unmark' : 'Mark'}
            </button>
            <div style={{
              ...styles.actionButton,
              backgroundColor: `${COLORS.secondary}15`,
              borderColor: COLORS.secondary,
              color: COLORS.secondary,
            }}>
              <FiTarget /> {question.marks || 1} Point{question.marks !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
        <div ref={questionBodyRef} style={styles.questionBody}>
          <div style={styles.questionText}>{question.text}</div>
          <div style={styles.optionsGrid}>
            {question.options.map((option, index) => {
              const isSelected = selectedAnswer === index;
              return (
                <div
                  key={index}
                  style={{
                    ...styles.optionItem,
                    borderColor: isSelected ? COLORS.primary : COLORS.border,
                    backgroundColor: isSelected ? `${COLORS.primary}05` : COLORS.white,
                  }}
                  onClick={() => handleAnswerSelect(question.id, index)}
                >
                  <div style={{
                    ...styles.optionLetter,
                    backgroundColor: isSelected ? COLORS.primary : COLORS.lightGray,
                    color: isSelected ? COLORS.white : COLORS.darkGray,
                  }}>
                    {String.fromCharCode(65 + index)}
                  </div>
                  <div style={styles.optionText}>{option}</div>
                  {isSelected && (
                    <FiCheck style={styles.optionCheck} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const NavigationButtons = () => (
    <div style={styles.navigationButtons}>
      <button
        style={{
          ...buttonStyles.secondary,
          opacity: currentQuestion === 0 ? 0.5 : 1,
          cursor: currentQuestion === 0 ? 'not-allowed' : 'pointer',
          padding: '10px 20px',
          fontSize: '12px', // Reduced by 6% from 13px
        }}
        disabled={currentQuestion === 0}
        onClick={() => setCurrentQuestion(prev => prev - 1)}
      >
        <FiChevronLeft /> Previous
      </button>
      <div style={styles.pageIndicator}>
        Question {currentQuestion + 1} of {questions.length}
      </div>
      {currentQuestion === questions.length - 1 ? (
        <button 
          style={{
            ...buttonStyles.primary,
            padding: '10px 20px',
            fontSize: '12px', // Reduced by 6% from 13px
          }} 
          onClick={() => setShowConfirmation(true)}
        >
          <FiSend /> Submit Test
        </button>
      ) : (
        <button
          style={{
            ...buttonStyles.primary,
            padding: '10px 20px',
            fontSize: '12px', // Reduced by 6% from 13px
          }}
          onClick={() => setCurrentQuestion(prev => prev + 1)}
        >
          Next <FiChevronRight />
        </button>
      )}
    </div>
  );

  const QuestionSidebar = () => {
    const filteredQuestions = getFilteredQuestions();
    const stats = getProgressStats();
    
    return (
      <div style={styles.sidebarContainer}>
        <div style={styles.sidebarCard}>
          <div style={styles.sidebarHeader}>
            <div style={styles.sidebarTitle}>
              Questions
              <button 
                style={styles.controlButton}
                onClick={() => setSidebarOpen(false)}
              >
                <FiChevronLeft />
              </button>
            </div>
            <div style={styles.filterTabs}>
              <button
                style={{
                  ...styles.filterTab,
                  backgroundColor: navigationMode === 'standard' ? COLORS.primary : COLORS.white,
                  color: navigationMode === 'standard' ? COLORS.white : COLORS.darkGray,
                  borderColor: navigationMode === 'standard' ? COLORS.primary : COLORS.border,
                }}
                onClick={() => setNavigationMode('standard')}
              >
                All
              </button>
              <button
                style={{
                  ...styles.filterTab,
                  backgroundColor: navigationMode === 'marked' ? COLORS.accent : COLORS.white,
                  color: navigationMode === 'marked' ? COLORS.white : COLORS.darkGray,
                  borderColor: navigationMode === 'marked' ? COLORS.accent : COLORS.border,
                }}
                onClick={() => setNavigationMode('marked')}
              >
                Marked
              </button>
              <button
                style={{
                  ...styles.filterTab,
                  backgroundColor: navigationMode === 'review' ? COLORS.secondary : COLORS.white,
                  color: navigationMode === 'review' ? COLORS.white : COLORS.darkGray,
                  borderColor: navigationMode === 'review' ? COLORS.secondary : COLORS.border,
                }}
                onClick={() => setNavigationMode('review')}
              >
                Review
              </button>
            </div>
            <div style={{
              fontSize: '11px', // Reduced by 6% from 12px
              color: COLORS.gray,
              marginTop: '10px',
              textAlign: 'center',
            }}>
              Progress: {stats.percentage}% ({stats.answered}/{stats.total})
            </div>
          </div>
          <div style={styles.questionsGridContainer} ref={sidebarRef}>
            <div style={styles.questionsGrid}>
              {(navigationMode === 'standard' ? questions.map((_, idx) => idx) : filteredQuestions).map((questionIndex) => {
                const status = getQuestionStatus(questionIndex);
                const isMarked = markedQuestions.includes(questionIndex);
                const isCurrent = currentQuestion === questionIndex;
                
                let backgroundColor = COLORS.white;
                let borderColor = COLORS.border;
                let color = COLORS.darkGray;
                
                if (isCurrent) {
                  backgroundColor = `${COLORS.primary}15`;
                  borderColor = COLORS.primary;
                }
                
                if (status === 'answered') {
                  borderColor = COLORS.secondary;
                } else if (status === 'marked') {
                  borderColor = COLORS.accent;
                }
                
                return (
                  <button
                    key={questionIndex}
                    style={{
                      ...styles.gridButton,
                      backgroundColor,
                      borderColor,
                      color,
                    }}
                    onClick={() => navigateToQuestion(questionIndex)}
                  >
                    {questionIndex + 1}
                    {isMarked && (
                      <FiFlag size={10} style={styles.flagIndicator} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          <div style={styles.sidebarFooter}>
            <div style={styles.legend}>
              <div style={styles.legendItem}>
                <div style={{ ...styles.legendDot, backgroundColor: COLORS.secondary }}></div>
                <span>Answered</span>
              </div>
              <div style={styles.legendItem}>
                <div style={{ ...styles.legendDot, backgroundColor: COLORS.accent }}></div>
                <span>Marked</span>
              </div>
              <div style={styles.legendItem}>
                <div style={{ ...styles.legendDot, backgroundColor: COLORS.primary }}></div>
                <span>Current</span>
              </div>
              <div style={styles.legendItem}>
                <div style={{ ...styles.legendDot, backgroundColor: COLORS.border }}></div>
                <span>Unanswered</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const SummaryPanel = () => {
    const stats = getProgressStats();
    
    return (
      <div style={styles.summaryPanel}>
        <div style={styles.summaryHeader}>
          <div style={styles.summaryTitle}>
            <FiBarChart2 /> Test Progress
          </div>
          <button 
            style={styles.controlButton}
            onClick={() => setShowSummary(false)}
          >
            <FiChevronUp />
          </button>
        </div>
        <div style={styles.summaryStats}>
          <div style={styles.summaryCard}>
            <div style={styles.summaryValue}>{stats.percentage}%</div>
            <div style={styles.summaryLabel}>Progress</div>
          </div>
          <div style={styles.summaryCard}>
            <div style={{ ...styles.summaryValue, color: COLORS.success }}>{stats.answered}</div>
            <div style={styles.summaryLabel}>Answered</div>
          </div>
          <div style={styles.summaryCard}>
            <div style={{ ...styles.summaryValue, color: COLORS.accent }}>{stats.marked}</div>
            <div style={styles.summaryLabel}>Marked</div>
          </div>
          <div style={styles.summaryCard}>
            <div style={{ ...styles.summaryValue, color: stats.remaining > 0 ? COLORS.danger : COLORS.gray }}>
              {stats.remaining}
            </div>
            <div style={styles.summaryLabel}>Pending</div>
          </div>
        </div>
        <button 
          style={{
            ...buttonStyles.secondary,
            marginTop: '15px',
            width: '100%',
            justifyContent: 'center',
            padding: '10px',
            fontSize: '11px', // Reduced by 6% from 12px
          }}
          onClick={saveProgress}
        >
          <FiSave /> {progressSaved ? 'Progress Saved' : 'Save Progress Now'}
        </button>
      </div>
    );
  };

  // Results Screen
  const ResultsScreen = () => {
    const totalMarks = questions.reduce((sum, q) => sum + (q.marks || 1), 0);
    const percentage = Math.round((score / totalMarks) * 100);
    const correctAnswers = questions.filter(q => q.isCorrect).length;
    const subjectName = subjects.find(s => s.id === selectedSubject)?.name;
    
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: COLORS.lightGray,
        padding: '20px',
        fontFamily: "'Inter', sans-serif"
      }}>
        <ToastContainer />
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          {/* Results Header */}
          <div style={{
            backgroundColor: COLORS.white,
            borderRadius: '16px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
            padding: '40px',
            marginBottom: '30px',
            textAlign: 'center'
          }}>
            <h1 style={{
              fontSize: '30px', // Reduced by 6% from 32px
              fontWeight: '700',
              color: COLORS.dark,
              marginBottom: '20px'
            }}>
              Practice Test Results
            </h1>
            <p style={{
              fontSize: '17px', // Reduced by 6% from 18px
              color: COLORS.gray,
              marginBottom: '30px'
            }}>
              {subjectName} • {levels.find(l => l.id === selectedLevel)?.name}
            </p>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '20px',
              marginBottom: '40px'
            }}>
              <div style={{
                backgroundColor: COLORS.lightGray,
                padding: '25px',
                borderRadius: '12px',
                border: `2px solid ${COLORS.primary}20`
              }}>
                <div style={{
                  fontSize: '13px', // Reduced by 6% from 14px
                  color: COLORS.gray,
                  marginBottom: '10px'
                }}>SCORE</div>
                <div style={{
                  fontSize: '38px', // Reduced by 6% from 40px
                  fontWeight: '800',
                  color: COLORS.primary
                }}>{score}/{totalMarks}</div>
              </div>
              
              <div style={{
                backgroundColor: COLORS.lightGray,
                padding: '25px',
                borderRadius: '12px',
                border: `2px solid ${percentage >= 70 ? COLORS.success : percentage >= 50 ? COLORS.warning : COLORS.danger}20`
              }}>
                <div style={{
                  fontSize: '13px', // Reduced by 6% from 14px
                  color: COLORS.gray,
                  marginBottom: '10px'
                }}>PERCENTAGE</div>
                <div style={{
                  fontSize: '38px', // Reduced by 6% from 40px
                  fontWeight: '800',
                  color: percentage >= 70 ? COLORS.success : percentage >= 50 ? COLORS.warning : COLORS.danger
                }}>{percentage}%</div>
              </div>
              
              <div style={{
                backgroundColor: COLORS.lightGray,
                padding: '25px',
                borderRadius: '12px',
                border: `2px solid ${COLORS.secondary}20`
              }}>
                <div style={{
                  fontSize: '13px', // Reduced by 6% from 14px
                  color: COLORS.gray,
                  marginBottom: '10px'
                }}>CORRECT ANSWERS</div>
                <div style={{
                  fontSize: '38px', // Reduced by 6% from 40px
                  fontWeight: '800',
                  color: COLORS.secondary
                }}>{correctAnswers}/{questions.length}</div>
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', flexWrap: 'wrap' }}>
              <button
                onClick={restartTest}
                style={{
                  ...buttonStyles.secondary,
                  padding: '12px 32px',
                  fontSize: '13px', // Reduced by 6% from 14px
                }}
              >
                <FiArrowLeft /> New Test
              </button>
              
              <button
                onClick={takeAnotherTest}
                style={{
                  ...buttonStyles.primary,
                  padding: '12px 32px',
                  fontSize: '13px', // Reduced by 6% from 14px
                }}
              >
                <FiRefreshCw /> Try Another Subject
              </button>
            </div>
          </div>
          
          {/* Question Review */}
          <div style={{
            backgroundColor: COLORS.white,
            borderRadius: '16px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
            padding: '40px'
          }}>
            <h2 style={{
              fontSize: '23px', // Reduced by 6% from 24px
              fontWeight: '700',
              color: COLORS.dark,
              marginBottom: '30px',
              paddingBottom: '20px',
              borderBottom: `2px solid ${COLORS.border}`
            }}>
              Question Review
            </h2>
            
            <div style={{ display: 'grid', gap: '20px' }}>
              {questions.map((q, index) => (
                <div
                  key={q.id}
                  style={{
                    padding: '25px',
                    backgroundColor: COLORS.lightGray,
                    borderRadius: '12px',
                    borderLeft: `4px solid ${q.isCorrect ? COLORS.success : COLORS.danger}`
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '20px'
                  }}>
                    <div>
                      <h3 style={{
                        fontSize: '15px', // Reduced by 6% from 16px
                        fontWeight: '600',
                        color: COLORS.dark,
                        marginBottom: '10px'
                      }}>
                        Question {index + 1}
                      </h3>
                      <p style={{
                        fontSize: '15px', // Reduced by 6% from 16px
                        color: COLORS.dark,
                        marginBottom: '15px',
                        lineHeight: 1.6
                      }}>
                        {q.text}
                      </p>
                      {q.topic && (
                        <div style={{
                          display: 'inline-block',
                          padding: '4px 12px',
                          backgroundColor: `${COLORS.primary}10`,
                          color: COLORS.primary,
                          borderRadius: '20px',
                          fontSize: '11px', // Reduced by 6% from 12px
                          fontWeight: '500',
                          marginBottom: '10px'
                        }}>
                          {q.topic}
                        </div>
                      )}
                    </div>
                    <div>
                      <span style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '11px', // Reduced by 6% from 12px
                        fontWeight: '600',
                        backgroundColor: q.isCorrect ? COLORS.success : COLORS.danger,
                        color: COLORS.white,
                        marginRight: '10px'
                      }}>
                        {q.isCorrect ? 'Correct' : 'Incorrect'}
                      </span>
                      {q.year && (
                        <span style={{
                          padding: '4px 8px',
                          backgroundColor: `${COLORS.gray}10`,
                          color: COLORS.gray,
                          borderRadius: '4px',
                          fontSize: '10px', // Reduced by 6% from 11px
                          fontWeight: '500'
                        }}>
                          {q.year}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '20px',
                    marginBottom: '15px'
                  }}>
                    <div>
                      <div style={{
                        fontSize: '11px', // Reduced by 6% from 12px
                        color: COLORS.gray,
                        marginBottom: '8px'
                      }}>Your Answer</div>
                      <div style={{
                        padding: '12px',
                        backgroundColor: COLORS.white,
                        borderRadius: '8px',
                        border: `1px solid ${q.isCorrect ? COLORS.success : COLORS.danger}`,
                        color: COLORS.dark,
                        fontSize: '13px' // Reduced by 6% from 14px
                      }}>
                        {q.options[q.userAnswer]}
                      </div>
                    </div>
                    <div>
                      <div style={{
                        fontSize: '11px', // Reduced by 6% from 12px
                        color: COLORS.gray,
                        marginBottom: '8px'
                      }}>Correct Answer</div>
                      <div style={{
                        padding: '12px',
                        backgroundColor: COLORS.white,
                        borderRadius: '8px',
                        border: `1px solid ${COLORS.success}`,
                        color: COLORS.dark,
                        fontSize: '13px' // Reduced by 6% from 14px
                      }}>
                        {q.options[q.correctAnswer]}
                      </div>
                    </div>
                  </div>
                  
                  {q.explanation && (
                    <div style={{
                      padding: '15px',
                      backgroundColor: COLORS.white,
                      borderRadius: '8px',
                      border: `1px solid ${COLORS.border}`
                    }}>
                      <div style={{
                        fontSize: '11px', // Reduced by 6% from 12px
                        color: COLORS.primary,
                        marginBottom: '8px',
                        fontWeight: '600'
                      }}>Explanation</div>
                      <div style={{
                        fontSize: '13px', // Reduced by 6% from 14px
                        color: COLORS.darkGray,
                        lineHeight: 1.6
                      }}>
                        {q.explanation}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return <LoadingScreen />;
  }

  if (testCompleted) {
    return <ResultsScreen />;
  }

  if (testStarted && !testCompleted) {
    const stats = getProgressStats();
    const subject = subjects.find(s => s.id === selectedSubject);
    const level = levels.find(l => l.id === selectedLevel);
    
    return (
      <div style={styles.container}>
        <ToastContainer />
        
        {/* Header */}
        <header style={styles.header}>
          <div style={styles.headerLeft}>
            <button style={styles.backButton} onClick={() => setShowConfirmation(true)}>
              <FiArrowLeft /> Exit Test
            </button>
            <div style={styles.testInfo}>
              <h1 style={styles.testTitle}>{subject?.name} Practice Test</h1>
              <div style={styles.testMeta}>
                <span style={styles.metaItem}>
                  <FiBook size={12} /> {subject?.name}
                </span>
                <span style={styles.metaItem}>
                  <FiUser size={12} /> {level?.name}
                </span>
                <span style={styles.metaItem}>
                  <FiCalendar size={12} /> Practice Mode
                </span>
              </div>
            </div>
          </div>
          
          <div style={styles.timerSection}>
            <div style={styles.timerCard}>
              <FiClock size={14} />
              {formatTime(timeLeft)}
              {timeWarning && (
                <div style={styles.timerWarning}>
                  <FiAlertTriangle size={10} /> Time Running Out!
                </div>
              )}
            </div>
            <button style={styles.controlButton} onClick={() => setIsPaused(!isPaused)}>
              {isPaused ? <FiPlay /> : <FiPause />}
            </button>
          </div>
          <div style={styles.headerControls}>
            <button style={styles.controlButton} onClick={saveProgress}>
              <FiSave color={progressSaved ? COLORS.success : COLORS.primary} />
            </button>
            <button style={styles.controlButton} onClick={() => setSidebarOpen(!sidebarOpen)}>
              <FiList />
            </button>
            <button style={styles.controlButton} onClick={toggleFullscreen}>
              {isFullscreen ? <FiMinimize /> : <FiMaximize />}
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main style={styles.mainContent}>
          <div style={styles.questionArea}>
            <QuestionDisplay />
            <NavigationButtons />
          </div>
          {sidebarOpen && <QuestionSidebar />}
        </main>

        {/* Footer */}
        <footer style={styles.footer}>
          <div style={styles.footerContent}>
            <div style={styles.progressStats}>
              <div style={styles.statItem}>
                <div style={{ ...styles.statBadge, backgroundColor: `${COLORS.success}15`, color: COLORS.success }}>
                  {stats.answered}
                </div>
                <span>Answered</span>
              </div>
              <div style={styles.statItem}>
                <div style={{ ...styles.statBadge, backgroundColor: `${COLORS.accent}15`, color: COLORS.accent }}>
                  {stats.marked}
                </div>
                <span>Marked</span>
              </div>
              <div style={styles.statItem}>
                <div style={{ ...styles.statBadge, backgroundColor: `${COLORS.gray}15`, color: COLORS.gray }}>
                  {stats.remaining}
                </div>
                <span>Pending</span>
              </div>
              <div style={styles.statItem}>
                <div style={{ ...styles.statBadge, backgroundColor: `${COLORS.primary}15`, color: COLORS.primary }}>
                  {formatTime(timeLeft)}
                </div>
                <span>Time Left</span>
              </div>
            </div>
            <div style={styles.footerActions}>
              <button style={styles.footerButton} onClick={() => setShowSummary(!showSummary)}>
                {showSummary ? <FiChevronDown /> : <FiChevronUp />} Summary
              </button>
              <button style={styles.footerButton} onClick={() => setShowInstructions(true)}>
                <FiHelpCircle /> Help
              </button>
              <button style={styles.submitButton} onClick={() => setShowConfirmation(true)}>
                <FiSend /> Submit Test
              </button>
            </div>
          </div>
          {showSummary && <SummaryPanel />}
        </footer>

        {/* Modals & Overlays */}
        {showInstructions && <InstructionsModal />}
        {showConfirmation && <ConfirmationModal />}
        {isPaused && <PauseOverlay />}

        {/* Global Styles */}
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          body {
            overflow: ${showInstructions || isPaused || showConfirmation ? 'hidden' : 'auto'};
          }
          ::-webkit-scrollbar {
            width: 6px;
            height: 6px;
          }
          ::-webkit-scrollbar-track {
            background: ${COLORS.lightGray};
            border-radius: 3px;
          }
          ::-webkit-scrollbar-thumb {
            background: ${COLORS.gray};
            border-radius: 3px;
          }
          ::-webkit-scrollbar-thumb:hover {
            background: ${COLORS.darkGray};
          }
          button {
            outline: none;
            font-family: inherit;
            cursor: pointer;
          }
          button:hover {
            transition: all 0.2s ease;
          }
          button:disabled {
            cursor: not-allowed;
          }
          h1, h2, h3, h4, h5, h6 {
            margin: 0;
            font-weight: 600;
          }
          p {
            margin: 0;
            line-height: 1.5;
          }
        `}</style>
      </div>
    );
  }

  // Landing page - Select test options
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: COLORS.lightGray,
      padding: '20px',
      fontFamily: "'Inter', sans-serif"
    }}>
      <ToastContainer />
      
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        {/* Header */}
        <div style={{
          textAlign: 'center',
          marginBottom: '50px',
          paddingTop: '20px'
        }}>
          <h1 style={{
            fontSize: '45px', // Reduced by 6% from 48px
            fontWeight: '800',
            color: COLORS.dark,
            marginBottom: '15px',
            background: `linear-gradient(45deg, ${COLORS.primary}, ${COLORS.primaryDark})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            Practice Mock Tests
          </h1>
          <p style={{
            fontSize: '19px', // Reduced by 6% from 20px
            color: COLORS.gray,
            maxWidth: '700px',
            margin: '0 auto 30px',
            lineHeight: '1.6'
          }}>
            Take unlimited practice tests with actual WAEC-style questions. 
            No registration required. Get instant feedback and detailed explanations.
          </p>
        </div>

        {/* Selection Cards */}
        <div style={{
          backgroundColor: COLORS.white,
          borderRadius: '16px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
          padding: '40px',
          marginBottom: '40px'
        }}>
          <h2 style={{
            fontSize: '23px', // Reduced by 6% from 24px
            fontWeight: '700',
            color: COLORS.dark,
            marginBottom: '30px',
            textAlign: 'center'
          }}>
            Select Your Practice Test
          </h2>
          
          {/* Subject Selection */}
          <div style={{ marginBottom: '40px' }}>
            <h3 style={{
              fontSize: '17px', // Reduced by 6% from 18px
              fontWeight: '600',
              color: COLORS.dark,
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <span>📚</span> Select Subject
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: '20px'
            }}>
              {subjects.map(subject => (
                <div
                  key={subject.id}
                  onClick={() => setSelectedSubject(subject.id)}
                  style={{
                    padding: '25px 20px',
                    backgroundColor: selectedSubject === subject.id ? COLORS.primary : COLORS.lightGray,
                    border: `2px solid ${selectedSubject === subject.id ? COLORS.primary : COLORS.border}`,
                    borderRadius: '12px',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.3s ease',
                    transform: selectedSubject === subject.id ? 'translateY(-2px)' : 'none',
                    boxShadow: selectedSubject === subject.id ? '0 8px 20px rgba(75, 83, 32, 0.15)' : 'none'
                  }}
                  onMouseOver={(e) => {
                    if (selectedSubject !== subject.id) {
                      e.currentTarget.style.borderColor = COLORS.primary;
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.1)';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (selectedSubject !== subject.id) {
                      e.currentTarget.style.borderColor = COLORS.border;
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }
                  }}
                >
                  <div style={{
                    fontSize: '36px',
                    marginBottom: '15px'
                  }}>
                    {subject.icon}
                  </div>
                  <div style={{
                    fontSize: '15px', // Reduced by 6% from 16px
                    fontWeight: '600',
                    color: selectedSubject === subject.id ? COLORS.white : COLORS.dark,
                    marginBottom: '8px'
                  }}>
                    {subject.name}
                  </div>
                  <div style={{
                    fontSize: '11px', // Reduced by 6% from 12px
                    color: selectedSubject === subject.id ? 'rgba(255,255,255,0.8)' : COLORS.gray
                  }}>
                    {subject.questions} questions
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Difficulty Selection */}
          <div style={{ marginBottom: '40px' }}>
            <h3 style={{
              fontSize: '17px', // Reduced by 6% from 18px
              fontWeight: '600',
              color: COLORS.dark,
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <span>📊</span> Select Test Type
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
              gap: '20px'
            }}>
              {levels.map(level => (
                <div
                  key={level.id}
                  onClick={() => setSelectedLevel(level.id)}
                  style={{
                    padding: '25px 20px',
                    backgroundColor: selectedLevel === level.id ? COLORS.primary : COLORS.lightGray,
                    border: `2px solid ${selectedLevel === level.id ? COLORS.primary : COLORS.border}`,
                    borderRadius: '12px',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.3s ease',
                    transform: selectedLevel === level.id ? 'translateY(-2px)' : 'none',
                    boxShadow: selectedLevel === level.id ? '0 8px 20px rgba(75, 83, 32, 0.15)' : 'none'
                  }}
                  onMouseOver={(e) => {
                    if (selectedLevel !== level.id) {
                      e.currentTarget.style.borderColor = COLORS.primary;
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.1)';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (selectedLevel !== level.id) {
                      e.currentTarget.style.borderColor = COLORS.border;
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }
                  }}
                >
                  <div style={{
                    fontSize: '15px', // Reduced by 6% from 16px
                    fontWeight: '600',
                    color: selectedLevel === level.id ? COLORS.white : COLORS.dark,
                    marginBottom: '10px'
                  }}>
                    {level.name}
                  </div>
                  <div style={{
                    fontSize: '13px', // Reduced by 6% from 14px
                    color: selectedLevel === level.id ? 'rgba(255,255,255,0.9)' : COLORS.gray,
                    marginBottom: '8px'
                  }}>
                    {level.questions} Questions
                  </div>
                  <div style={{
                    fontSize: '12px', // Reduced by 6% from 13px
                    color: selectedLevel === level.id ? 'rgba(255,255,255,0.8)' : COLORS.gray,
                    marginBottom: '10px'
                  }}>
                    {level.duration} Minutes
                  </div>
                  <div style={{
                    fontSize: '11px', // Reduced by 6% from 12px
                    color: selectedLevel === level.id ? 'rgba(255,255,255,0.7)' : COLORS.gray,
                    lineHeight: '1.4'
                  }}>
                    {level.description}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Start Button */}
          <div style={{ textAlign: 'center' }}>
            <button
              onClick={startTest}
              disabled={!selectedSubject || !selectedLevel}
              style={{
                ...buttonStyles.primary,
                padding: '16px 48px',
                fontSize: '15px', // Reduced by 6% from 16px
                minWidth: '200px',
                opacity: selectedSubject && selectedLevel ? 1 : 0.6,
                cursor: selectedSubject && selectedLevel ? 'pointer' : 'not-allowed',
                transform: selectedSubject && selectedLevel ? 'translateY(0)' : 'none',
                '&:hover': {
                  transform: selectedSubject && selectedLevel ? 'translateY(-2px)' : 'none',
                }
              }}
            >
              <FiPlay /> Start Practice Test
            </button>
            
            {(!selectedSubject || !selectedLevel) && (
              <p style={{
                fontSize: '13px', // Reduced by 6% from 14px
                color: COLORS.danger,
                marginTop: '15px'
              }}>
                Please select both subject and test type
              </p>
            )}
          </div>
        </div>
        
        {/* Features */}
        <div style={{
          backgroundColor: COLORS.white,
          borderRadius: '16px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
          padding: '40px',
          marginBottom: '40px'
        }}>
          <h2 style={{
            fontSize: '23px', // Reduced by 6% from 24px
            fontWeight: '700',
            color: COLORS.dark,
            marginBottom: '30px',
            textAlign: 'center'
          }}>
            Why Practice With Mock Tests?
          </h2>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '30px'
          }}>
            <div style={{ textAlign: 'center', padding: '25px' }}>
              <div style={{
                fontSize: '36px',
                marginBottom: '20px',
                color: COLORS.primary
              }}>🕒</div>
              <h3 style={{
                fontSize: '17px', // Reduced by 6% from 18px
                fontWeight: '600',
                color: COLORS.dark,
                marginBottom: '12px'
              }}>Timed Practice</h3>
              <p style={{
                fontSize: '13px', // Reduced by 6% from 14px
                color: COLORS.gray,
                lineHeight: '1.6'
              }}>
                Practice under timed conditions matching actual exam durations to improve time management.
              </p>
            </div>
            
            <div style={{ textAlign: 'center', padding: '25px' }}>
              <div style={{
                fontSize: '36px',
                marginBottom: '20px',
                color: COLORS.primary
              }}>📈</div>
              <h3 style={{
                fontSize: '17px', // Reduced by 6% from 18px
                fontWeight: '600',
                color: COLORS.dark,
                marginBottom: '12px'
              }}>WAEC-Style Questions</h3>
              <p style={{
                fontSize: '13px', // Reduced by 6% from 14px
                color: COLORS.gray,
                lineHeight: '1.6'
              }}>
                Authentic past questions with detailed explanations to understand concepts better.
              </p>
            </div>
            
            <div style={{ textAlign: 'center', padding: '25px' }}>
              <div style={{
                fontSize: '36px',
                marginBottom: '20px',
                color: COLORS.primary
              }}>🔄</div>
              <h3 style={{
                fontSize: '17px', // Reduced by 6% from 18px
                fontWeight: '600',
                color: COLORS.dark,
                marginBottom: '12px'
              }}>Unlimited Attempts</h3>
              <p style={{
                fontSize: '13px', // Reduced by 6% from 14px
                color: COLORS.gray,
                lineHeight: '1.6'
              }}>
                Take as many practice tests as you want with different question sets each time.
              </p>
            </div>
            
            <div style={{ textAlign: 'center', padding: '25px' }}>
              <div style={{
                fontSize: '36px',
                marginBottom: '20px',
                color: COLORS.primary
              }}>🎯</div>
              <h3 style={{
                fontSize: '17px', // Reduced by 6% from 18px
                fontWeight: '600',
                color: COLORS.dark,
                marginBottom: '12px'
              }}>Instant Feedback</h3>
              <p style={{
                fontSize: '13px', // Reduced by 6% from 14px
                color: COLORS.gray,
                lineHeight: '1.6'
              }}>
                Get immediate results with detailed explanations for every question.
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={{
          backgroundColor: COLORS.white,
          borderRadius: '16px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
          padding: '30px',
          textAlign: 'center'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '20px'
          }}>
            <div>
              <div style={{
                fontSize: '30px', // Reduced by 6% from 32px
                fontWeight: '700',
                color: COLORS.primary,
                marginBottom: '5px'
              }}>
                {Object.values(questionBanks).reduce((sum, bank) => sum + bank.length, 0)}+
              </div>
              <div style={{
                fontSize: '13px', // Reduced by 6% from 14px
                color: COLORS.gray
              }}>
                Practice Questions
              </div>
            </div>
            <div>
              <div style={{
                fontSize: '30px', // Reduced by 6% from 32px
                fontWeight: '700',
                color: COLORS.primary,
                marginBottom: '5px'
              }}>
                {subjects.length}
              </div>
              <div style={{
                fontSize: '13px', // Reduced by 6% from 14px
                color: COLORS.gray
              }}>
                Subjects
              </div>
            </div>
            <div>
              <div style={{
                fontSize: '30px', // Reduced by 6% from 32px
                fontWeight: '700',
                color: COLORS.primary,
                marginBottom: '5px'
              }}>
                {levels.length}
              </div>
              <div style={{
                fontSize: '13px', // Reduced by 6% from 14px
                color: COLORS.gray
              }}>
                Test Types
              </div>
            </div>
            <div>
              <div style={{
                fontSize: '30px', // Reduced by 6% from 32px
                fontWeight: '700',
                color: COLORS.primary,
                marginBottom: '5px'
              }}>
                100%
              </div>
              <div style={{
                fontSize: '13px', // Reduced by 6% from 14px
                color: COLORS.gray
              }}>
                Free Access
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MockTests;