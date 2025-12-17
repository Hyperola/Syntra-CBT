import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { ToastContainer } from 'react-toastify';

const MockTests = () => {
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('');
  const [testStarted, setTestStarted] = useState(false);
  const [testCompleted, setTestCompleted] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(null);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(false);

  // Available subjects and difficulty levels
  const subjects = [
    { id: 'english', name: 'English', icon: '📚' },
    { id: 'mathematics', name: 'Mathematics', icon: '🧮' },
    { id: 'science', name: 'Science', icon: '🔬' },
    { id: 'computer', name: 'Computer Science', icon: '💻' },
    { id: 'general', name: 'General Knowledge', icon: '🌍' }
  ];

  const levels = [
    { id: 'beginner', name: 'Beginner', questions: 10, duration: 15 },
    { id: 'intermediate', name: 'Intermediate', questions: 15, duration: 25 },
    { id: 'advanced', name: 'Advanced', questions: 20, duration: 40 }
  ];

  // Generate random questions based on subject and level
  const generateQuestions = (subject, level) => {
    const questionCount = levels.find(l => l.id === level)?.questions || 10;
    const generatedQuestions = [];

    // Question generators for each subject
    const questionGenerators = {
      english: generateEnglishQuestions,
      mathematics: generateMathQuestions,
      science: generateScienceQuestions,
      computer: generateComputerQuestions,
      general: generateGeneralQuestions
    };

    const generator = questionGenerators[subject];
    if (generator) {
      for (let i = 0; i < questionCount; i++) {
        generatedQuestions.push(generator(i, level));
      }
    }

    return generatedQuestions;
  };

  // English question generator
  const generateEnglishQuestions = (index, level) => {
    const questionTypes = [
      {
        type: 'grammar',
        text: 'Choose the correct sentence:',
        options: [
          'She don\'t like apples.',
          'She doesn\'t likes apples.',
          'She doesn\'t like apples.',
          'She don\'t likes apples.'
        ],
        correctAnswer: 2
      },
      {
        type: 'vocabulary',
        text: 'What is the synonym of "abundant"?',
        options: ['Scarce', 'Plentiful', 'Empty', 'Limited'],
        correctAnswer: 1
      },
      {
        type: 'comprehension',
        text: 'Which word is an adjective in: "The quick brown fox jumps over the lazy dog"?',
        options: ['quick', 'fox', 'jumps', 'dog'],
        correctAnswer: 0
      }
    ];

    const type = questionTypes[index % questionTypes.length];
    return {
      id: `eng-${index}`,
      text: type.text,
      type: 'multiple-choice',
      options: type.options,
      correctAnswer: type.correctAnswer,
      explanation: getEnglishExplanation(type.type),
      marks: 1
    };
  };

  // Math question generator
  const generateMathQuestions = (index, level) => {
    let num1, num2, operation, text, options, correctAnswer;

    if (level === 'beginner') {
      num1 = Math.floor(Math.random() * 20) + 1;
      num2 = Math.floor(Math.random() * 20) + 1;
      const operations = ['+', '-', '×', '÷'];
      const op = operations[Math.floor(Math.random() * operations.length)];
      
      switch(op) {
        case '+':
          text = `What is ${num1} + ${num2}?`;
          correctAnswer = num1 + num2;
          break;
        case '-':
          text = `What is ${num1} - ${num2}?`;
          correctAnswer = num1 - num2;
          break;
        case '×':
          text = `What is ${num1} × ${num2}?`;
          correctAnswer = num1 * num2;
          break;
        case '÷':
          num2 = Math.max(1, num2);
          num1 = num2 * (Math.floor(Math.random() * 10) + 1);
          text = `What is ${num1} ÷ ${num2}?`;
          correctAnswer = num1 / num2;
          break;
      }

      // Generate options
      options = generateOptions(correctAnswer, 'number');
    } else if (level === 'intermediate') {
      const types = ['algebra', 'geometry', 'fractions'];
      const type = types[index % types.length];
      
      switch(type) {
        case 'algebra':
          const a = Math.floor(Math.random() * 5) + 1;
          const b = Math.floor(Math.random() * 10) + 1;
          text = `Solve for x: ${a}x + ${b} = ${a * 3 + b}`;
          correctAnswer = 3;
          options = generateOptions(3, 'number');
          break;
        case 'geometry':
          const side = Math.floor(Math.random() * 10) + 1;
          text = `What is the area of a square with side ${side} cm?`;
          correctAnswer = side * side;
          options = generateOptions(side * side, 'number');
          break;
        case 'fractions':
          const n1 = Math.floor(Math.random() * 5) + 1;
          const d1 = Math.floor(Math.random() * 5) + 2;
          const n2 = Math.floor(Math.random() * 5) + 1;
          const d2 = Math.floor(Math.random() * 5) + 2;
          text = `What is ${n1}/${d1} + ${n2}/${d2}?`;
          const lcm = d1 * d2;
          const sum = (n1 * (lcm/d1) + n2 * (lcm/d2)) / lcm;
          correctAnswer = simplifyFraction(n1 * d2 + n2 * d1, d1 * d2);
          options = generateFractionOptions(n1, d1, n2, d2);
          break;
      }
    } else {
      // Advanced questions
      const types = ['trigonometry', 'calculus', 'probability'];
      const type = types[index % types.length];
      
      switch(type) {
        case 'trigonometry':
          const angle = [30, 45, 60][Math.floor(Math.random() * 3)];
          const func = ['sin', 'cos', 'tan'][Math.floor(Math.random() * 3)];
          text = `What is ${func}(${angle}°)?`;
          correctAnswer = getTrigValue(func, angle);
          options = generateOptions(correctAnswer, 'decimal');
          break;
        case 'calculus':
          const coef = Math.floor(Math.random() * 3) + 1;
          const exp = Math.floor(Math.random() * 3) + 2;
          text = `What is the derivative of ${coef}x^${exp}?`;
          correctAnswer = `${coef * exp}x^${exp - 1}`;
          options = [
            `${coef * exp}x^${exp - 1}`,
            `${coef}x^${exp - 1}`,
            `${coef * exp}x^${exp}`,
            `${coef * (exp + 1)}x^${exp}`
          ];
          break;
        case 'probability':
          const total = Math.floor(Math.random() * 10) + 5;
          const favorable = Math.floor(Math.random() * total) + 1;
          text = `A bag contains ${total} marbles, ${favorable} of which are red. What is the probability of drawing a red marble?`;
          correctAnswer = `${favorable}/${total}`;
          options = generateFractionOptions(favorable, total);
          break;
      }
    }

    return {
      id: `math-${index}`,
      text,
      type: 'multiple-choice',
      options: options.map(opt => opt.toString()),
      correctAnswer: options.indexOf(correctAnswer.toString()),
      explanation: getMathExplanation(text, correctAnswer),
      marks: level === 'advanced' ? 2 : 1
    };
  };

  // Science question generator
  const generateScienceQuestions = (index, level) => {
    const scienceQuestions = [
      {
        text: 'Which planet is known as the Red Planet?',
        options: ['Venus', 'Mars', 'Jupiter', 'Saturn'],
        correctAnswer: 1,
        explanation: 'Mars is called the Red Planet because of its reddish appearance due to iron oxide on its surface.'
      },
      {
        text: 'What is the chemical symbol for Gold?',
        options: ['Go', 'Gd', 'Au', 'Ag'],
        correctAnswer: 2,
        explanation: 'Au comes from the Latin word "Aurum" which means Gold.'
      },
      {
        text: 'Which gas do plants absorb during photosynthesis?',
        options: ['Oxygen', 'Nitrogen', 'Carbon Dioxide', 'Hydrogen'],
        correctAnswer: 2,
        explanation: 'Plants absorb carbon dioxide (CO₂) and release oxygen during photosynthesis.'
      },
      {
        text: 'What is the hardest natural substance on Earth?',
        options: ['Gold', 'Iron', 'Diamond', 'Platinum'],
        correctAnswer: 2,
        explanation: 'Diamond is the hardest known natural material on Earth.'
      },
      {
        text: 'How many bones are in the adult human body?',
        options: ['206', '200', '210', '215'],
        correctAnswer: 0,
        explanation: 'An adult human body has 206 bones, while a baby has about 300 bones that fuse together.'
      }
    ];

    const question = scienceQuestions[index % scienceQuestions.length];
    return {
      id: `sci-${index}`,
      text: question.text,
      type: 'multiple-choice',
      options: question.options,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
      marks: 1
    };
  };

  // Computer question generator
  const generateComputerQuestions = (index, level) => {
    const computerQuestions = [
      {
        text: 'What does "CPU" stand for?',
        options: [
          'Central Processing Unit',
          'Computer Processing Unit',
          'Central Process Unit',
          'Computer Process Unit'
        ],
        correctAnswer: 0,
        explanation: 'CPU stands for Central Processing Unit, the primary component of a computer.'
      },
      {
        text: 'Which programming language is known as the language of the web?',
        options: ['Python', 'Java', 'JavaScript', 'C++'],
        correctAnswer: 2,
        explanation: 'JavaScript is the primary language for web development and runs in browsers.'
      },
      {
        text: 'What is the main function of RAM?',
        options: [
          'Permanent storage',
          'Temporary memory for running programs',
          'Graphics processing',
          'Network connectivity'
        ],
        correctAnswer: 1,
        explanation: 'RAM (Random Access Memory) provides temporary storage for running programs and data.'
      },
      {
        text: 'Which company developed the Windows operating system?',
        options: ['Apple', 'Microsoft', 'Google', 'IBM'],
        correctAnswer: 1,
        explanation: 'Microsoft developed and maintains the Windows operating system.'
      },
      {
        text: 'What does "HTML" stand for?',
        options: [
          'Hyper Text Markup Language',
          'High Tech Modern Language',
          'Hyper Transfer Markup Language',
          'High Text Machine Language'
        ],
        correctAnswer: 0,
        explanation: 'HTML stands for Hyper Text Markup Language, used for creating web pages.'
      }
    ];

    const question = computerQuestions[index % computerQuestions.length];
    return {
      id: `comp-${index}`,
      text: question.text,
      type: 'multiple-choice',
      options: question.options,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
      marks: 1
    };
  };

  // General Knowledge question generator
  const generateGeneralQuestions = (index, level) => {
    const gkQuestions = [
      {
        text: 'Which country is known as the Land of the Rising Sun?',
        options: ['China', 'Japan', 'Thailand', 'South Korea'],
        correctAnswer: 1,
        explanation: 'Japan is called the "Land of the Rising Sun" because the sun rises first in the east.'
      },
      {
        text: 'Who painted the Mona Lisa?',
        options: ['Vincent van Gogh', 'Pablo Picasso', 'Leonardo da Vinci', 'Michelangelo'],
        correctAnswer: 2,
        explanation: 'Leonardo da Vinci painted the Mona Lisa in the 16th century.'
      },
      {
        text: 'What is the capital of Australia?',
        options: ['Sydney', 'Melbourne', 'Canberra', 'Perth'],
        correctAnswer: 2,
        explanation: 'Canberra is the capital city of Australia, not Sydney which is the largest city.'
      },
      {
        text: 'Which ocean is the largest?',
        options: ['Atlantic Ocean', 'Indian Ocean', 'Pacific Ocean', 'Arctic Ocean'],
        correctAnswer: 2,
        explanation: 'The Pacific Ocean is the largest and deepest ocean on Earth.'
      },
      {
        text: 'How many continents are there?',
        options: ['5', '6', '7', '8'],
        correctAnswer: 2,
        explanation: 'There are 7 continents: Africa, Antarctica, Asia, Europe, North America, Australia/Oceania, and South America.'
      }
    ];

    const question = gkQuestions[index % gkQuestions.length];
    return {
      id: `gk-${index}`,
      text: question.text,
      type: 'multiple-choice',
      options: question.options,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
      marks: 1
    };
  };

  // Helper functions
  const generateOptions = (correctAnswer, type) => {
    const options = new Set([correctAnswer]);
    
    while (options.size < 4) {
      let randomOption;
      if (type === 'number') {
        const deviation = Math.floor(Math.random() * 10) + 1;
        randomOption = correctAnswer + (Math.random() > 0.5 ? deviation : -deviation);
        if (randomOption < 0) randomOption = Math.abs(randomOption);
      } else if (type === 'decimal') {
        const deviation = (Math.random() * 0.5).toFixed(2);
        randomOption = (parseFloat(correctAnswer) + (Math.random() > 0.5 ? parseFloat(deviation) : -parseFloat(deviation))).toFixed(2);
      } else {
        randomOption = Math.floor(Math.random() * 20) + 1;
      }
      options.add(randomOption.toString());
    }
    
    return Array.from(options).sort(() => Math.random() - 0.5);
  };

  const generateFractionOptions = (num1, den1, num2, den2) => {
    const correct = simplifyFraction(num1 * den2 + num2 * den1, den1 * den2);
    const options = new Set([correct]);
    
    while (options.size < 4) {
      const wrongNum = Math.floor(Math.random() * 10) + 1;
      const wrongDen = Math.floor(Math.random() * 10) + 2;
      options.add(simplifyFraction(wrongNum, wrongDen));
    }
    
    return Array.from(options).sort(() => Math.random() - 0.5);
  };

  const simplifyFraction = (numerator, denominator) => {
    const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
    const divisor = gcd(numerator, denominator);
    return `${numerator/divisor}/${denominator/divisor}`;
  };

  const getTrigValue = (func, angle) => {
    const values = {
      sin: { 30: '0.5', 45: '0.707', 60: '0.866' },
      cos: { 30: '0.866', 45: '0.707', 60: '0.5' },
      tan: { 30: '0.577', 45: '1', 60: '1.732' }
    };
    return values[func][angle].toString();
  };

  const getEnglishExplanation = (type) => {
    switch(type) {
      case 'grammar': return 'Third person singular (he/she/it) uses "does" + base form of verb.';
      case 'vocabulary': return '"Abundant" means existing in large quantities; plentiful.';
      case 'comprehension': return 'Adjectives describe nouns. "Quick" and "brown" describe the fox.';
      default: return '';
    }
  };

  const getMathExplanation = (question, answer) => {
    if (question.includes('+')) return `Add the two numbers: ${question.split('What is ')[1].split('?')[0]}`;
    if (question.includes('-')) return `Subtract the second number from the first: ${question.split('What is ')[1].split('?')[0]}`;
    if (question.includes('×')) return `Multiply the two numbers: ${question.split('What is ')[1].split('?')[0]}`;
    if (question.includes('÷')) return `Divide the first number by the second: ${question.split('What is ')[1].split('?')[0]}`;
    if (question.includes('area')) return 'Area of square = side × side';
    if (question.includes('derivative')) return 'Power rule: d/dx(xⁿ) = n·xⁿ⁻¹';
    return 'Check your calculation.';
  };

  // Start mock test
  const startTest = () => {
    if (!selectedSubject || !selectedLevel) {
      toast.error('Please select both subject and difficulty level', { position: 'top-right', autoClose: 3000 });
      return;
    }

    setLoading(true);
    
    // Generate questions
    const generatedQuestions = generateQuestions(selectedSubject, selectedLevel);
    setQuestions(generatedQuestions);
    
    // Set timer
    const duration = levels.find(l => l.id === selectedLevel)?.duration || 15;
    setTimeLeft(duration * 60); // Convert to seconds
    
    setTestStarted(true);
    setTestCompleted(false);
    setCurrentQuestion(0);
    setAnswers({});
    setScore(0);
    
    setTimeout(() => setLoading(false), 500);
  };

  // Handle answer selection
  const handleAnswerSelect = (questionId, answerIndex) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answerIndex
    }));
  };

  // Move to next question
  const nextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    }
  };

  // Move to previous question
  const prevQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    }
  };

  // Submit test
  const submitTest = () => {
    let calculatedScore = 0;
    const results = [];
    
    questions.forEach(question => {
      const userAnswer = answers[question.id];
      const isCorrect = userAnswer === question.correctAnswer;
      
      if (isCorrect) {
        calculatedScore += question.marks;
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
  };

  // Timer effect
  useEffect(() => {
    if (testStarted && !testCompleted && timeLeft > 0) {
      const timer = setTimeout(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (testStarted && !testCompleted && timeLeft === 0) {
      submitTest();
      toast.info('Time is up! Test submitted automatically.', { position: 'top-right', autoClose: 5000 });
    }
  }, [testStarted, testCompleted, timeLeft]);

  // Format time
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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
    setTimeLeft(null);
    setScore(0);
  };

  // Take another test
  const takeAnotherTest = () => {
    setTestStarted(false);
    setTestCompleted(false);
    setQuestions([]);
    setCurrentQuestion(0);
    setAnswers({});
    setTimeLeft(null);
    setScore(0);
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#F8F9FA',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Roboto', sans-serif"
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '60px',
            height: '60px',
            border: '5px solid #f3f3f3',
            borderTop: '5px solid #4B5320',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }}></div>
          <p style={{
            color: '#4B5320',
            fontSize: '18px',
            fontWeight: '600'
          }}>Generating your practice test...</p>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  if (testStarted && !testCompleted) {
    const question = questions[currentQuestion];
    const totalQuestions = questions.length;
    const progress = ((currentQuestion + 1) / totalQuestions) * 100;

    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#F8F9FA',
        padding: '20px',
        fontFamily: "'Roboto', sans-serif"
      }}>
        <ToastContainer />
        
        <div style={{
          maxWidth: '800px',
          margin: '0 auto',
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          padding: '30px'
        }}>
          {/* Test Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '30px',
            paddingBottom: '20px',
            borderBottom: '2px solid #F0F0F0'
          }}>
            <div>
              <h1 style={{
                fontSize: '24px',
                fontWeight: '700',
                color: '#2C3E50',
                marginBottom: '8px'
              }}>
                Practice Test: {subjects.find(s => s.id === selectedSubject)?.name}
              </h1>
              <p style={{
                color: '#7F8C8D',
                fontSize: '14px'
              }}>
                Level: {levels.find(l => l.id === selectedLevel)?.name}
              </p>
            </div>
            
            <div style={{
              textAlign: 'center',
              backgroundColor: '#4B5320',
              color: '#FFFFFF',
              padding: '12px 24px',
              borderRadius: '8px',
              minWidth: '100px'
            }}>
              <div style={{
                fontSize: '12px',
                opacity: 0.8,
                marginBottom: '4px'
              }}>TIME LEFT</div>
              <div style={{
                fontSize: '24px',
                fontWeight: '700',
                fontFamily: 'monospace'
              }}>
                {formatTime(timeLeft)}
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div style={{
            marginBottom: '30px'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '8px'
            }}>
              <span style={{
                fontSize: '14px',
                color: '#7F8C8D'
              }}>
                Question {currentQuestion + 1} of {totalQuestions}
              </span>
              <span style={{
                fontSize: '14px',
                color: '#4B5320',
                fontWeight: '600'
              }}>
                {Math.round(progress)}%
              </span>
            </div>
            <div style={{
              height: '8px',
              backgroundColor: '#F0F0F0',
              borderRadius: '4px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${progress}%`,
                height: '100%',
                backgroundColor: '#4B5320',
                transition: 'width 0.3s ease',
                borderRadius: '4px'
              }}></div>
            </div>
          </div>

          {/* Question */}
          <div style={{
            backgroundColor: '#F8F9FA',
            padding: '30px',
            borderRadius: '8px',
            marginBottom: '30px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <span style={{
                backgroundColor: '#4B5320',
                color: '#FFFFFF',
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: '12px',
                fontSize: '14px',
                fontWeight: '600'
              }}>
                {currentQuestion + 1}
              </span>
              <h2 style={{
                fontSize: '18px',
                fontWeight: '600',
                color: '#2C3E50',
                margin: 0
              }}>
                {question?.text}
              </h2>
            </div>

            {/* Options */}
            <div style={{
              display: 'grid',
              gap: '12px'
            }}>
              {question?.options?.map((option, index) => {
                const isSelected = answers[question.id] === index;
                const optionLetters = ['A', 'B', 'C', 'D'];
                
                return (
                  <div
                    key={index}
                    onClick={() => handleAnswerSelect(question.id, index)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '16px',
                      backgroundColor: isSelected ? '#4B5320' : '#FFFFFF',
                      border: `2px solid ${isSelected ? '#4B5320' : '#E8E8E8'}`,
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseOver={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = '#4B5320';
                        e.currentTarget.style.backgroundColor = '#F8F9FA';
                      }
                    }}
                    onMouseOut={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = '#E8E8E8';
                        e.currentTarget.style.backgroundColor = '#FFFFFF';
                      }
                    }}
                  >
                    <span style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      backgroundColor: isSelected ? '#FFFFFF' : '#F0F0F0',
                      color: isSelected ? '#4B5320' : '#7F8C8D',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: '12px',
                      fontSize: '14px',
                      fontWeight: '600',
                      flexShrink: 0
                    }}>
                      {optionLetters[index]}
                    </span>
                    <span style={{
                      color: isSelected ? '#FFFFFF' : '#2C3E50',
                      fontSize: '16px'
                    }}>
                      {option}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Navigation Buttons */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              {currentQuestion > 0 && (
                <button
                  onClick={prevQuestion}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: 'transparent',
                    color: '#4B5320',
                    border: '2px solid #4B5320',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = '#4B5320';
                    e.currentTarget.style.color = '#FFFFFF';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#4B5320';
                  }}
                >
                  ← Previous
                </button>
              )}
            </div>
            
            <div style={{ display: 'flex', gap: '12px' }}>
              {currentQuestion < totalQuestions - 1 ? (
                <button
                  onClick={nextQuestion}
                  style={{
                    padding: '12px 32px',
                    backgroundColor: '#4B5320',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'background-color 0.3s ease'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = '#3A4422';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = '#4B5320';
                  }}
                >
                  Next →
                </button>
              ) : (
                <button
                  onClick={submitTest}
                  style={{
                    padding: '12px 32px',
                    backgroundColor: '#27AE60',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'background-color 0.3s ease'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = '#219653';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = '#27AE60';
                  }}
                >
                  Submit Test
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (testCompleted) {
    const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0);
    const percentage = Math.round((score / totalMarks) * 100);
    const correctAnswers = questions.filter(q => q.isCorrect).length;
    
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#F8F9FA',
        padding: '20px',
        fontFamily: "'Roboto', sans-serif"
      }}>
        <div style={{
          maxWidth: '1000px',
          margin: '0 auto'
        }}>
          {/* Results Header */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            padding: '40px',
            marginBottom: '30px',
            textAlign: 'center'
          }}>
            <h1 style={{
              fontSize: '32px',
              fontWeight: '700',
              color: '#2C3E50',
              marginBottom: '20px'
            }}>
              Practice Test Results
            </h1>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '20px',
              marginBottom: '40px'
            }}>
              <div style={{
                backgroundColor: '#F8F9FA',
                padding: '24px',
                borderRadius: '8px',
                border: '2px solid #E8E8E8'
              }}>
                <div style={{
                  fontSize: '14px',
                  color: '#7F8C8D',
                  marginBottom: '8px'
                }}>SCORE</div>
                <div style={{
                  fontSize: '36px',
                  fontWeight: '700',
                  color: '#4B5320'
                }}>{score}/{totalMarks}</div>
              </div>
              
              <div style={{
                backgroundColor: '#F8F9FA',
                padding: '24px',
                borderRadius: '8px',
                border: '2px solid #E8E8E8'
              }}>
                <div style={{
                  fontSize: '14px',
                  color: '#7F8C8D',
                  marginBottom: '8px'
                }}>PERCENTAGE</div>
                <div style={{
                  fontSize: '36px',
                  fontWeight: '700',
                  color: percentage >= 70 ? '#27AE60' : percentage >= 50 ? '#F39C12' : '#E74C3C'
                }}>{percentage}%</div>
              </div>
              
              <div style={{
                backgroundColor: '#F8F9FA',
                padding: '24px',
                borderRadius: '8px',
                border: '2px solid #E8E8E8'
              }}>
                <div style={{
                  fontSize: '14px',
                  color: '#7F8C8D',
                  marginBottom: '8px'
                }}>CORRECT ANSWERS</div>
                <div style={{
                  fontSize: '36px',
                  fontWeight: '700',
                  color: '#2C3E50'
                }}>{correctAnswers}/{questions.length}</div>
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
              <button
                onClick={restartTest}
                style={{
                  padding: '12px 32px',
                  backgroundColor: 'transparent',
                  color: '#4B5320',
                  border: '2px solid #4B5320',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#4B5320';
                  e.currentTarget.style.color = '#FFFFFF';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#4B5320';
                }}
              >
                ← Start New Test
              </button>
              
              <button
                onClick={takeAnotherTest}
                style={{
                  padding: '12px 32px',
                  backgroundColor: '#4B5320',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'background-color 0.3s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#3A4422';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#4B5320';
                }}
              >
                Try Another Subject
              </button>
            </div>
          </div>
          
          {/* Question Review */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            padding: '40px'
          }}>
            <h2 style={{
              fontSize: '24px',
              fontWeight: '700',
              color: '#2C3E50',
              marginBottom: '30px',
              paddingBottom: '20px',
              borderBottom: '2px solid #F0F0F0'
            }}>
              Question Review
            </h2>
            
            <div style={{ display: 'grid', gap: '20px' }}>
              {questions.map((q, index) => (
                <div
                  key={q.id}
                  style={{
                    padding: '24px',
                    backgroundColor: '#F8F9FA',
                    borderRadius: '8px',
                    borderLeft: `4px solid ${q.isCorrect ? '#27AE60' : '#E74C3C'}`
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '16px'
                  }}>
                    <div>
                      <h3 style={{
                        fontSize: '16px',
                        fontWeight: '600',
                        color: '#2C3E50',
                        marginBottom: '8px'
                      }}>
                        Question {index + 1}
                      </h3>
                      <p style={{
                        fontSize: '16px',
                        color: '#2C3E50',
                        marginBottom: '12px'
                      }}>
                        {q.text}
                      </p>
                    </div>
                    <span style={{
                      padding: '6px 12px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '600',
                      backgroundColor: q.isCorrect ? '#27AE60' : '#E74C3C',
                      color: '#FFFFFF'
                    }}>
                      {q.isCorrect ? 'Correct' : 'Incorrect'}
                    </span>
                  </div>
                  
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '20px',
                    marginBottom: '16px'
                  }}>
                    <div>
                      <div style={{
                        fontSize: '12px',
                        color: '#7F8C8D',
                        marginBottom: '4px'
                      }}>Your Answer</div>
                      <div style={{
                        padding: '8px 12px',
                        backgroundColor: '#FFFFFF',
                        borderRadius: '4px',
                        border: `1px solid ${q.isCorrect ? '#27AE60' : '#E74C3C'}`,
                        color: '#2C3E50'
                      }}>
                        {q.options[q.userAnswer]}
                      </div>
                    </div>
                    <div>
                      <div style={{
                        fontSize: '12px',
                        color: '#7F8C8D',
                        marginBottom: '4px'
                      }}>Correct Answer</div>
                      <div style={{
                        padding: '8px 12px',
                        backgroundColor: '#FFFFFF',
                        borderRadius: '4px',
                        border: '1px solid #27AE60',
                        color: '#2C3E50'
                      }}>
                        {q.options[q.correctAnswer]}
                      </div>
                    </div>
                  </div>
                  
                  {q.explanation && (
                    <div style={{
                      padding: '12px',
                      backgroundColor: '#FFFFFF',
                      borderRadius: '4px',
                      border: '1px solid #E8E8E8'
                    }}>
                      <div style={{
                        fontSize: '12px',
                        color: '#7F8C8D',
                        marginBottom: '4px'
                      }}>Explanation</div>
                      <div style={{
                        fontSize: '14px',
                        color: '#2C3E50'
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
  }

  // Landing page - Select test options
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#F8F9FA',
      padding: '20px',
      fontFamily: "'Roboto', sans-serif"
    }}>
      <ToastContainer />
      
      <div style={{
        maxWidth: '800px',
        margin: '0 auto'
      }}>
        {/* Header */}
        <div style={{
          textAlign: 'center',
          marginBottom: '40px'
        }}>
          <h1 style={{
            fontSize: '40px',
            fontWeight: '800',
            color: '#2C3E50',
            marginBottom: '12px',
            background: 'linear-gradient(45deg, #4B5320, #8B7355)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            Practice Mock Tests
          </h1>
          <p style={{
            fontSize: '18px',
            color: '#7F8C8D',
            maxWidth: '600px',
            margin: '0 auto',
            lineHeight: '1.6'
          }}>
            Take unlimited practice tests to improve your skills. No registration or submission required.
            Get instant feedback and detailed explanations.
          </p>
        </div>

        {/* Selection Cards */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          padding: '40px',
          marginBottom: '40px'
        }}>
          <h2 style={{
            fontSize: '24px',
            fontWeight: '700',
            color: '#2C3E50',
            marginBottom: '30px',
            textAlign: 'center'
          }}>
            Select Your Practice Test
          </h2>
          
          {/* Subject Selection */}
          <div style={{ marginBottom: '40px' }}>
            <h3 style={{
              fontSize: '16px',
              fontWeight: '600',
              color: '#2C3E50',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span>📚</span> Select Subject
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
              gap: '16px'
            }}>
              {subjects.map(subject => (
                <div
                  key={subject.id}
                  onClick={() => setSelectedSubject(subject.id)}
                  style={{
                    padding: '24px 16px',
                    backgroundColor: selectedSubject === subject.id ? '#4B5320' : '#F8F9FA',
                    border: `2px solid ${selectedSubject === subject.id ? '#4B5320' : '#E8E8E8'}`,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseOver={(e) => {
                    if (selectedSubject !== subject.id) {
                      e.currentTarget.style.borderColor = '#4B5320';
                      e.currentTarget.style.backgroundColor = '#F0F0F0';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (selectedSubject !== subject.id) {
                      e.currentTarget.style.borderColor = '#E8E8E8';
                      e.currentTarget.style.backgroundColor = '#F8F9FA';
                    }
                  }}
                >
                  <div style={{
                    fontSize: '32px',
                    marginBottom: '12px'
                  }}>
                    {subject.icon}
                  </div>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: selectedSubject === subject.id ? '#FFFFFF' : '#2C3E50'
                  }}>
                    {subject.name}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Difficulty Selection */}
          <div style={{ marginBottom: '40px' }}>
            <h3 style={{
              fontSize: '16px',
              fontWeight: '600',
              color: '#2C3E50',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span>📊</span> Select Difficulty Level
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '16px'
            }}>
              {levels.map(level => (
                <div
                  key={level.id}
                  onClick={() => setSelectedLevel(level.id)}
                  style={{
                    padding: '24px 16px',
                    backgroundColor: selectedLevel === level.id ? '#4B5320' : '#F8F9FA',
                    border: `2px solid ${selectedLevel === level.id ? '#4B5320' : '#E8E8E8'}`,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseOver={(e) => {
                    if (selectedLevel !== level.id) {
                      e.currentTarget.style.borderColor = '#4B5320';
                      e.currentTarget.style.backgroundColor = '#F0F0F0';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (selectedLevel !== level.id) {
                      e.currentTarget.style.borderColor = '#E8E8E8';
                      e.currentTarget.style.backgroundColor = '#F8F9FA';
                    }
                  }}
                >
                  <div style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: selectedLevel === level.id ? '#FFFFFF' : '#2C3E50',
                    marginBottom: '8px'
                  }}>
                    {level.name}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: selectedLevel === level.id ? '#FFFFFF' : '#7F8C8D',
                    marginBottom: '4px'
                  }}>
                    {level.questions} Questions
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: selectedLevel === level.id ? '#FFFFFF' : '#7F8C8D'
                  }}>
                    {level.duration} Minutes
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
                padding: '16px 48px',
                backgroundColor: selectedSubject && selectedLevel ? '#4B5320' : '#E8E8E8',
                color: selectedSubject && selectedLevel ? '#FFFFFF' : '#7F8C8D',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: selectedSubject && selectedLevel ? 'pointer' : 'not-allowed',
                transition: 'all 0.3s ease',
                minWidth: '200px'
              }}
              onMouseOver={(e) => {
                if (selectedSubject && selectedLevel) {
                  e.currentTarget.style.backgroundColor = '#3A4422';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }
              }}
              onMouseOut={(e) => {
                if (selectedSubject && selectedLevel) {
                  e.currentTarget.style.backgroundColor = '#4B5320';
                  e.currentTarget.style.transform = 'translateY(0)';
                }
              }}
            >
              Start Practice Test
            </button>
            
            {(!selectedSubject || !selectedLevel) && (
              <p style={{
                fontSize: '14px',
                color: '#E74C3C',
                marginTop: '12px'
              }}>
                Please select both subject and difficulty level
              </p>
            )}
          </div>
        </div>
        
        {/* Features */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          padding: '40px'
        }}>
          <h2 style={{
            fontSize: '24px',
            fontWeight: '700',
            color: '#2C3E50',
            marginBottom: '30px',
            textAlign: 'center'
          }}>
            Why Practice With Mock Tests?
          </h2>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '24px'
          }}>
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <div style={{
                fontSize: '32px',
                marginBottom: '16px',
                color: '#4B5320'
              }}>🕒</div>
              <h3 style={{
                fontSize: '16px',
                fontWeight: '600',
                color: '#2C3E50',
                marginBottom: '8px'
              }}>Timed Practice</h3>
              <p style={{
                fontSize: '14px',
                color: '#7F8C8D',
                lineHeight: '1.6'
              }}>
                Practice under timed conditions to improve your speed and time management skills.
              </p>
            </div>
            
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <div style={{
                fontSize: '32px',
                marginBottom: '16px',
                color: '#4B5320'
              }}>📈</div>
              <h3 style={{
                fontSize: '16px',
                fontWeight: '600',
                color: '#2C3E50',
                marginBottom: '8px'
              }}>Instant Results</h3>
              <p style={{
                fontSize: '14px',
                color: '#7F8C8D',
                lineHeight: '1.6'
              }}>
                Get immediate feedback with detailed explanations for every question.
              </p>
            </div>
            
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <div style={{
                fontSize: '32px',
                marginBottom: '16px',
                color: '#4B5320'
              }}>🔄</div>
              <h3 style={{
                fontSize: '16px',
                fontWeight: '600',
                color: '#2C3E50',
                marginBottom: '8px'
              }}>Unlimited Attempts</h3>
              <p style={{
                fontSize: '14px',
                color: '#7F8C8D',
                lineHeight: '1.6'
              }}>
                Take as many practice tests as you want. No limits, no records kept.
              </p>
            </div>
            
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <div style={{
                fontSize: '32px',
                marginBottom: '16px',
                color: '#4B5320'
              }}>🎯</div>
              <h3 style={{
                fontSize: '16px',
                fontWeight: '600',
                color: '#2C3E50',
                marginBottom: '8px'
              }}>Adaptive Difficulty</h3>
              <p style={{
                fontSize: '14px',
                color: '#7F8C8D',
                lineHeight: '1.6'
              }}>
                Questions adjust based on your selected difficulty level from beginner to advanced.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MockTests;