// Mock digital clone profiles for game generation pipeline
// These are enriched learner profiles used by the orchestrator

import type { DigitalCloneProfile } from './types'

export const digitalCloneProfiles: DigitalCloneProfile[] = [
  {
    name: 'Sarah',
    subject: 'Python Programming',
    level: 'beginner',
    context: 'Career switcher from marketing (3 years in digital marketing). Started learning Python 6 weeks ago through an online bootcamp. Highly motivated but sometimes frustrated by abstract concepts. Learns best with concrete, relatable examples.',

    knownStrengths: [
      'Variables and assignment',
      'Basic if/else branching',
      'Simple for loops with range()',
      'String concatenation and f-strings',
      'Using print() for debugging',
    ],
    knownGaps: [
      'Functions: when to use parameters vs return values',
      'Mutable vs immutable types',
      'List methods (.append vs .extend vs +)',
      'Dictionary iteration patterns',
      'Scope rules (local vs global)',
      'Basic OOP concepts',
    ],
    misconceptions: [
      'Thinks assignment always copies data (doesn\'t understand references)',
      'Believes functions must always return something explicitly',
      'Confuses parameters and arguments',
      'Thinks .sort() returns a new sorted list',
    ],

    preferredModalities: ['hands-on', 'visual'],
    responseToChallenge: 'Gets frustrated briefly, then asks "can you show me an example?" Recovers quickly with concrete demonstrations.',
    engagementTriggers: [
      'Real-world analogies (marketing data, spreadsheets)',
      'Seeing her code actually do something visual',
      'Small wins and streaks',
    ],

    recentPerformance: [
      { game: 'Sort Battle', score: 14, maxScore: 18, notableErrors: ['Put "set" in Immutable', 'Confused SyntaxError with RuntimeError'] },
      { game: 'Prediction Bet', score: 2, maxScore: 4, notableErrors: ['Didn\'t predict reference aliasing', 'Thought strings were mutable'] },
      { game: 'Error Detective', score: 8, maxScore: 10, notableErrors: ['Missed that .sort() returns None'] },
    ],

    currentModule: 'Functions and Scope',
    modulesCompleted: ['Variables & Types', 'Control Flow', 'Loops', 'Strings'],
    upcomingTopics: ['Data Structures Deep Dive', 'File I/O', 'Error Handling', 'Classes & Objects'],
  },
  {
    name: 'Marcus',
    subject: 'World War 2 History',
    level: 'intermediate',
    context: 'History enthusiast in his 40s. Avid reader and documentary watcher. Has solid knowledge of the "greatest hits" events but wants to understand the strategic, economic, and political dimensions that shaped outcomes. Particularly interested in counterfactual analysis ("what if" scenarios).',

    knownStrengths: [
      'Major timeline events (1939-1945)',
      'Key leaders and their roles',
      'European theater broad strokes',
      'Pacific theater major battles',
      'Holocaust awareness',
    ],
    knownGaps: [
      'Strategic decision-making rationale behind key operations',
      'Eastern Front beyond Stalingrad',
      'The role of logistics and industrial capacity',
      'Intelligence warfare (Enigma, Ultra, Venona)',
      'Home front impacts and civilian experience',
      'Lesser-known theaters (North Africa, China-Burma-India)',
    ],
    misconceptions: [
      'Overestimates the role of individual battles vs logistics/attrition',
      'Thinks D-Day was primarily an American operation',
      'Assumes the atomic bombs were the sole reason Japan surrendered',
      'Underestimates Soviet contribution to Allied victory',
    ],

    preferredModalities: ['analytical', 'conversational'],
    responseToChallenge: 'Loves being wrong when given a surprising fact. Will argue his position first, then gracefully update when shown evidence.',
    engagementTriggers: [
      'Counterfactual scenarios ("what if Hitler hadn\'t invaded Russia?")',
      'Surprising statistics or lesser-known facts',
      'Strategic analysis and "fog of war" decisions',
    ],

    recentPerformance: [
      { game: 'Timeline', score: 5, maxScore: 6, notableErrors: ['Placed Munich Agreement after Anschluss (both 1938 — got order wrong)'] },
      { game: 'Flow Diagram', score: 3, maxScore: 4, notableErrors: ['Didn\'t know Hitler diverted to Kiev'] },
      { game: 'Claim-Evidence', score: 2, maxScore: 3, notableErrors: ['Picked distractor about Russian winter instead of Stalingrad being the turning point'] },
    ],

    currentModule: 'Strategic Decision-Making',
    modulesCompleted: ['Timeline of the War', 'Major Leaders', 'European Theater', 'Pacific Theater'],
    upcomingTopics: ['Intelligence & Code-Breaking', 'Economics of Total War', 'Home Fronts', 'Legacy & Cold War Origins'],
  },
  {
    name: 'Priya',
    subject: 'Machine Learning',
    level: 'intermediate',
    context: 'Software engineer at a mid-size tech company (4 years experience). Strong in Python and statistics. Took Andrew Ng\'s Coursera course last year. Now trying to apply ML at work but keeps hitting walls on model selection and debugging. Very analytical and enjoys mathematical precision.',

    knownStrengths: [
      'Linear regression and logistic regression',
      'Train/test splitting and cross-validation',
      'Basic feature engineering',
      'Pandas and NumPy data manipulation',
      'Gradient descent (conceptual)',
      'Supervised vs unsupervised distinction',
    ],
    knownGaps: [
      'Neural network architecture design choices',
      'Backpropagation mechanics (can\'t trace it by hand)',
      'When to use which model (decision trees vs SVM vs neural nets)',
      'Regularization techniques (L1 vs L2, dropout)',
      'Handling imbalanced datasets',
      'Model interpretability and explainability',
    ],
    misconceptions: [
      'Thinks more features always help (doesn\'t grasp curse of dimensionality)',
      'Believes accuracy is the best metric for all problems',
      'Assumes neural nets are always better than simpler models',
      'Confused about what "training" actually optimizes (thinks it\'s accuracy, not loss)',
    ],

    preferredModalities: ['analytical', 'hands-on'],
    responseToChallenge: 'Methodical. Pauses, thinks through the math, then gives a precise answer. If wrong, asks "where did my reasoning break down?"',
    engagementTriggers: [
      'Mathematical intuition behind algorithms',
      'Real-world case studies of ML failures',
      'Comparing approaches on the same problem',
    ],

    recentPerformance: [
      { game: 'Sort Battle', score: 15, maxScore: 18, notableErrors: ['Classified PCA as supervised', 'Missed that sentiment analysis is classification'] },
      { game: 'Node Graph', score: 4, maxScore: 5, notableErrors: ['Got backprop gradient sign wrong'] },
      { game: 'Prediction Bet', score: 1, maxScore: 3, notableErrors: ['Predicted more features = better performance', 'Didn\'t account for class imbalance'] },
    ],

    currentModule: 'Model Selection & Evaluation',
    modulesCompleted: ['ML Foundations', 'Supervised Learning', 'Data Preprocessing', 'Feature Engineering'],
    upcomingTopics: ['Neural Networks & Deep Learning', 'Unsupervised Learning', 'Ensemble Methods', 'ML in Production'],
  },
  {
    name: 'Alex',
    subject: 'Quantum Computing',
    level: 'beginner',
    context: 'Physics undergraduate in their third year. Strong classical mechanics and linear algebra background. Just started a quantum computing elective. Fascinated by the topic but struggling to bridge the gap between quantum mechanics theory and practical quantum algorithms.',

    knownStrengths: [
      'Linear algebra (eigenvalues, matrix multiplication, vector spaces)',
      'Classical computing basics (gates, circuits, binary)',
      'Quantum mechanics fundamentals (wave-particle duality, superposition concept)',
      'Dirac notation basics',
    ],
    knownGaps: [
      'Quantum gates (Hadamard, CNOT, T-gate) and their matrix representations',
      'Entanglement as a computational resource',
      'Quantum circuit construction',
      'Grover\'s and Shor\'s algorithms',
      'Quantum error correction',
      'Difference between quantum and classical complexity classes',
    ],
    misconceptions: [
      'Thinks quantum computers can try all solutions simultaneously (misunderstands parallelism)',
      'Believes measurement is deterministic after superposition',
      'Confuses qubits having "more states" with qubits being continuous-valued',
    ],

    preferredModalities: ['visual', 'analytical'],
    responseToChallenge: 'Tries to map everything back to linear algebra concepts they know. Sometimes overfits classical intuitions onto quantum behavior.',
    engagementTriggers: [
      'Circuit diagrams and visual gate representations',
      'Step-by-step mathematical traces',
      'Comparing quantum vs classical approaches to same problem',
    ],

    recentPerformance: [],

    currentModule: 'Quantum Gates & Circuits',
    modulesCompleted: ['Classical Computing Review', 'Qubits & Superposition'],
    upcomingTopics: ['Entanglement', 'Quantum Algorithms', 'Quantum Error Correction', 'Quantum Advantage'],
  },
]
