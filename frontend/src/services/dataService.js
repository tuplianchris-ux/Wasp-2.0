/**
 * localStorage-based Data Service
 * Provides mock data and CRUD operations for all features
 * Designed to be easily replaceable with real API calls
 */

// Utility functions
const generateId = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
const saveToLocalStorage = (key, data) => localStorage.setItem(key, JSON.stringify(data));
const loadFromLocalStorage = (key, defaultValue = null) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error(`Error loading ${key} from localStorage:`, error);
    return defaultValue;
  }
};

// Mock data generators
const generateMockUsers = () => [
  {
    user_id: 'user_demo_001',
    email: 'demo@taskflow.com',
    name: 'Alex Student',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alex',
    banner: null,
    bio: 'High school student passionate about learning and growth',
    xp: 1250,
    coins: 350,
    level: 3,
    is_premium: false,
    avatar_frame: null,
    badges: ['early_adopter', 'week_streak'],
    school_id: 'school_demo_001',
    created_at: new Date().toISOString()
  },
  {
    user_id: 'user_demo_002', 
    email: 'sarah@taskflow.com',
    name: 'Sarah Scholar',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sarah',
    banner: null,
    bio: 'College student studying computer science',
    xp: 2100,
    coins: 525,
    level: 5,
    is_premium: true,
    avatar_frame: 'gold',
    badges: ['top_performer', 'month_streak'],
    school_id: 'school_demo_002',
    created_at: new Date().toISOString()
  }
];

const generateMockTasks = (userId) => [
  {
    task_id: generateId('task'),
    user_id: userId,
    title: 'Complete Math Homework',
    description: 'Finish calculus problems 1-20 from Chapter 5',
    due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    category: 'academics',
    is_template: false,
    completed: false,
    progress: 60,
    priority: 'high',
    tags: ['math', 'homework', 'calculus'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    task_id: generateId('task'),
    user_id: userId,
    title: 'Study for SAT Vocabulary',
    description: 'Review 50 new vocabulary words for upcoming SAT',
    due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    category: 'test_prep',
    is_template: false,
    completed: false,
    progress: 30,
    priority: 'medium',
    tags: ['sat', 'vocabulary', 'test_prep'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    task_id: generateId('task'),
    user_id: userId,
    title: 'Essay Outline',
    description: 'Create outline for English literature essay',
    due_date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
    category: 'academics',
    is_template: false,
    completed: false,
    progress: 0,
    priority: 'high',
    tags: ['english', 'essay', 'writing'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

const generateMockNotes = (userId) => [
  {
    note_id: generateId('note'),
    user_id: userId,
    title: 'Calculus Chapter 5 Notes',
    content: `# Calculus Chapter 5: Derivatives

## Key Concepts
- **Derivative Definition**: The rate of change of a function
- **Notation**: f'(x) or dy/dx
- **Power Rule**: If f(x) = x^n, then f'(x) = nx^(n-1)

## Important Formulas
1. **Product Rule**: (fg)' = f'g + fg'
2. **Quotient Rule**: (f/g)' = (f'g - fg')/g²
3. **Chain Rule**: (f∘g)' = (f'∘g) × g'

## Practice Problems
1. Find the derivative of f(x) = 3x² + 2x - 5
2. Differentiate g(x) = (x² + 1)(x - 3)
3. Find h'(x) for h(x) = (x² + 1)³

## Tips
- Always remember to apply the chain rule for composite functions
- Practice recognizing patterns in functions
- Use the product rule when multiplying functions`,
    folder: 'math',
    tags: ['calculus', 'derivatives', 'math'],
    is_favorite: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    note_id: generateId('note'),
    user_id: userId,
    title: 'SAT Vocabulary List',
    content: `# SAT Vocabulary Words

## Week 1 Words
1. **Ephemeral** - lasting for a very short time
2. **Ubiquitous** - present, appearing, or found everywhere
3. **Pragmatic** - dealing with things sensibly and realistically
4. **Ambivalent** - having mixed feelings or contradictory ideas
5. **Eloquent** - fluent or persuasive in speaking or writing

## Memory Tips
- **Ephemeral**: Think "emperor" - emperors don't last forever
- **Ubiquitous**: "U bi quit us" - you can't quit us because we're everywhere
- **Pragmatic**: "Prag" like "practical" - practical approach
- **Ambivalent**: "Ambi" like "ambiguous" - mixed feelings
- **Eloquent**: "E" like "excellent" speaker

## Practice Sentences
1. The beauty of cherry blossoms is ephemeral, lasting only a few weeks.
2. Smartphones have become ubiquitous in modern society.
3. We need a pragmatic approach to solve this complex problem.
4. She felt ambivalent about moving to a new city.
5. The president gave an eloquent speech that inspired the nation.`,
    folder: 'sat_prep',
    tags: ['sat', 'vocabulary', 'test_prep'],
    is_favorite: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

const generateMockLibraryItems = () => [
  {
    item_id: generateId('library'),
    item_type: 'quiz',
    title: 'Calculus Basics Quiz',
    content: {
      questions: [
        {
          id: 1,
          question: 'What is the derivative of x²?',
          options: ['2x', 'x²', '2', 'x'],
          correct: 0,
          explanation: 'Using the power rule: d/dx(x²) = 2x^(2-1) = 2x'
        },
        {
          id: 2,
          question: 'What is the limit of sin(x)/x as x approaches 0?',
          options: ['0', '1', '∞', 'undefined'],
          correct: 1,
          explanation: 'This is a fundamental limit in calculus: lim(x→0) sin(x)/x = 1'
        }
      ]
    },
    source_text: 'Basic calculus concepts and derivatives',
    difficulty: 'medium',
    estimated_time: 10,
    created_at: new Date().toISOString()
  },
  {
    item_id: generateId('library'),
    item_type: 'flashcards',
    title: 'SAT Vocabulary Flashcards',
    content: {
      cards: [
        {
          front: 'Ephemeral',
          back: 'Lasting for a very short time; fleeting',
          example: 'The beauty of cherry blossoms is ephemeral.'
        },
        {
          front: 'Ubiquitous',
          back: 'Present, appearing, or found everywhere',
          example: 'Smartphones have become ubiquitous in modern society.'
        }
      ]
    },
    source_text: 'Common SAT vocabulary words',
    difficulty: 'medium',
    estimated_time: 15,
    created_at: new Date().toISOString()
  }
];

const generateMockCompetitions = () => {
  const now = Date.now();
  const inMins = (mins) => new Date(now + mins * 60 * 1000).toISOString();
  const inHours = (h) => new Date(now + h * 60 * 60 * 1000).toISOString();
  const inDays = (d) => new Date(now + d * 24 * 60 * 60 * 1000).toISOString();
  const ago = (mins) => new Date(now - mins * 60 * 1000).toISOString();
  return [
    {
      competition_id: generateId('comp'),
      title: 'Knowledge Blitz — Live Now',
      description: 'Multiple choice race. Answer fast, score high. Currently in progress.',
      competition_type: 'speed',
      difficulty: 'medium',
      start_time: ago(15),
      end_time: inMins(45),
      max_participants: 50,
      current_participants: 32,
      prizes: [
        { rank: 1, xp: 400, coins: 80 },
        { rank: 2, xp: 250, coins: 50 },
        { rank: 3, xp: 150, coins: 30 }
      ],
      rules: 'Complete 10 multiple choice questions. Faster correct answers earn more points.',
      created_at: new Date().toISOString()
    },
    {
      competition_id: generateId('comp'),
      title: 'Quick Blitz — Starting Soon',
      description: 'Short 5-minute Knowledge Blitz. Perfect for a quick study break.',
      competition_type: 'speed',
      difficulty: 'easy',
      start_time: inMins(8),
      end_time: inMins(23),
      max_participants: 100,
      current_participants: 67,
      prizes: [
        { rank: 1, xp: 200, coins: 40 },
        { rank: 2, xp: 120, coins: 25 },
        { rank: 3, xp: 80, coins: 15 }
      ],
      rules: '5 questions, AI picks the topic. Best time + accuracy wins.',
      created_at: new Date().toISOString()
    },
    {
      competition_id: generateId('comp'),
      title: 'Weekly Math Challenge',
      description: 'Test your calculus skills against other students. Speed and accuracy.',
      competition_type: 'speed',
      difficulty: 'medium',
      start_time: inHours(24),
      end_time: inHours(25),
      max_participants: 100,
      current_participants: 47,
      prizes: [
        { rank: 1, xp: 500, coins: 100 },
        { rank: 2, xp: 300, coins: 50 },
        { rank: 3, xp: 200, coins: 25 }
      ],
      rules: 'Complete 20 math problems as quickly and accurately as possible',
      created_at: new Date().toISOString()
    },
    {
      competition_id: generateId('comp'),
      title: 'SAT Vocabulary Sprint',
      description: 'Race against the clock to define vocabulary words. 1v1 style rounds.',
      competition_type: 'accuracy',
      difficulty: 'easy',
      start_time: inDays(2),
      end_time: inDays(3),
      max_participants: 200,
      current_participants: 89,
      prizes: [
        { rank: 1, xp: 300, coins: 75 },
        { rank: 2, xp: 200, coins: 40 },
        { rank: 3, xp: 150, coins: 20 }
      ],
      rules: 'Define 50 vocabulary words with 90%+ accuracy. First correct answer wins each round.',
      created_at: new Date().toISOString()
    },
    {
      competition_id: generateId('comp'),
      title: 'Accuracy Duel — Science',
      description: '1v1 battle on science questions. First correct answer wins the round.',
      competition_type: 'accuracy',
      difficulty: 'hard',
      start_time: inHours(6),
      end_time: inHours(7),
      max_participants: 32,
      current_participants: 18,
      prizes: [
        { rank: 1, xp: 350, coins: 70 },
        { rank: 2, xp: 200, coins: 40 }
      ],
      rules: 'Best of 7 rounds. Reduce opponent HP to zero by answering correctly first.',
      created_at: new Date().toISOString()
    },
    {
      competition_id: generateId('comp'),
      title: 'Vocab Jam — Weekend Special',
      description: 'Match terms to definitions. Speed and accuracy multiply your XP.',
      competition_type: 'vocab',
      difficulty: 'medium',
      start_time: inDays(1),
      end_time: inDays(1.5),
      max_participants: 150,
      current_participants: 94,
      prizes: [
        { rank: 1, xp: 400, coins: 80 },
        { rank: 2, xp: 250, coins: 50 },
        { rank: 3, xp: 150, coins: 30 }
      ],
      rules: 'Match 5 term-definition pairs. Streaks boost your score.',
      created_at: new Date().toISOString()
    }
  ];
};

const generateMockShopItems = () => [
  {
    item_id: generateId('shop'),
    name: 'Premium Study Planner',
    description: 'Advanced planning tools with AI-powered suggestions',
    price: 499,
    currency: 'coins',
    category: 'tools',
    is_premium: true,
    icon: '📚',
    benefits: ['AI study suggestions', 'Advanced analytics', 'Unlimited tasks'],
    stock: -1, // unlimited
    created_at: new Date().toISOString()
  },
  {
    item_id: generateId('shop'),
    name: 'Energy Boost Pack',
    description: 'Get 5 extra AI calls for your studies',
    price: 50,
    currency: 'coins',
    category: 'consumables',
    is_premium: false,
    icon: '⚡',
    benefits: ['5 extra AI calls', 'Instant activation', 'Stackable'],
    stock: 100,
    created_at: new Date().toISOString()
  },
  {
    item_id: generateId('shop'),
    name: 'Gold Avatar Frame',
    description: 'Show off your premium status with a golden avatar frame',
    price: 1000,
    currency: 'coins',
    category: 'cosmetics',
    is_premium: false,
    icon: '👑',
    benefits: ['Golden frame', 'Premium badge', 'Exclusive access'],
    stock: -1,
    created_at: new Date().toISOString()
  }
];

const generateMockCommunityData = () => ({
  servers: [
    {
      server_id: generateId('server'),
      name: 'Study Hall',
      description: 'General study community for all subjects',
      icon: '📖',
      member_count: 1234,
      is_public: true,
      channels: [
        {
          channel_id: generateId('channel'),
          name: 'general',
          description: 'General study discussions',
          type: 'text'
        },
        {
          channel_id: generateId('channel'),
          name: 'homework-help',
          description: 'Get help with homework assignments',
          type: 'text'
        }
      ],
      created_at: new Date().toISOString()
    }
  ],
  messages: [
    {
      message_id: generateId('message'),
      channel_id: 'channel_demo_001',
      user_id: 'user_demo_002',
      content: 'Anyone want to form a study group for calculus?',
      timestamp: new Date().toISOString(),
      reactions: []
    }
  ]
});

// Initialize mock data
const initializeMockData = () => {
  const users = generateMockUsers();
  const tasks = [
    ...generateMockTasks(users[0].user_id),
    ...generateMockTasks(users[1].user_id)
  ];
  const notes = [
    ...generateMockNotes(users[0].user_id),
    ...generateMockNotes(users[1].user_id)
  ];
  const libraryItems = generateMockLibraryItems();
  const competitions = generateMockCompetitions();
  const shopItems = generateMockShopItems();
  const communityData = generateMockCommunityData();

  // Only initialize if data doesn't exist
  if (!loadFromLocalStorage('users')) {
    saveToLocalStorage('users', users);
  }
  if (!loadFromLocalStorage('tasks')) {
    saveToLocalStorage('tasks', tasks);
  }
  if (!loadFromLocalStorage('notes')) {
    saveToLocalStorage('notes', notes);
  }
  if (!loadFromLocalStorage('library_items')) {
    saveToLocalStorage('library_items', libraryItems);
  }
  if (!loadFromLocalStorage('competitions')) {
    saveToLocalStorage('competitions', competitions);
  }
  if (!loadFromLocalStorage('shop_items')) {
    saveToLocalStorage('shop_items', shopItems);
  }
  if (!loadFromLocalStorage('community_data')) {
    saveToLocalStorage('community_data', communityData);
  }
};

// Data Service API
class DataService {
  constructor() {
    this.initializeData();
  }

  initializeData() {
    initializeMockData();
  }

  // User operations
  async getCurrentUser() {
    let users = loadFromLocalStorage('users', []);
    if (!users || users.length === 0) {
      const newUsers = generateMockUsers();
      saveToLocalStorage('users', newUsers);
      users = newUsers;
    }
    return users[0]; // Return first user as current user
  }

  async updateUser(userId, updates) {
    const users = loadFromLocalStorage('users', []);
    const userIndex = users.findIndex(u => u.user_id === userId);
    if (userIndex !== -1) {
      users[userIndex] = { ...users[userIndex], ...updates };
      saveToLocalStorage('users', users);
      return users[userIndex];
    }
    throw new Error('User not found');
  }

  // Task operations
  async getTasks(userId) {
    const tasks = loadFromLocalStorage('tasks', []);
    return tasks.filter(task => task.user_id === userId);
  }

  async createTask(taskData) {
    const tasks = loadFromLocalStorage('tasks', []);
    const newTask = {
      task_id: generateId('task'),
      ...taskData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    tasks.push(newTask);
    saveToLocalStorage('tasks', tasks);
    return newTask;
  }

  async updateTask(taskId, updates) {
    const tasks = loadFromLocalStorage('tasks', []);
    const taskIndex = tasks.findIndex(t => t.task_id === taskId);
    if (taskIndex !== -1) {
      tasks[taskIndex] = { 
        ...tasks[taskIndex], 
        ...updates, 
        updated_at: new Date().toISOString() 
      };
      saveToLocalStorage('tasks', tasks);
      return tasks[taskIndex];
    }
    throw new Error('Task not found');
  }

  async deleteTask(taskId) {
    const tasks = loadFromLocalStorage('tasks', []);
    const filteredTasks = tasks.filter(t => t.task_id !== taskId);
    saveToLocalStorage('tasks', filteredTasks);
    return true;
  }

  // Notes operations
  async getNotes(userId) {
    const notes = loadFromLocalStorage('notes', []);
    return notes.filter(note => note.user_id === userId);
  }

  async createNote(noteData) {
    const notes = loadFromLocalStorage('notes', []);
    const newNote = {
      note_id: generateId('note'),
      ...noteData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    notes.push(newNote);
    saveToLocalStorage('notes', notes);
    return newNote;
  }

  async updateNote(noteId, updates) {
    const notes = loadFromLocalStorage('notes', []);
    const noteIndex = notes.findIndex(n => n.note_id === noteId);
    if (noteIndex !== -1) {
      notes[noteIndex] = { 
        ...notes[noteIndex], 
        ...updates, 
        updated_at: new Date().toISOString() 
      };
      saveToLocalStorage('notes', notes);
      return notes[noteIndex];
    }
    throw new Error('Note not found');
  }

  async deleteNote(noteId) {
    const notes = loadFromLocalStorage('notes', []);
    const filteredNotes = notes.filter(n => n.note_id !== noteId);
    saveToLocalStorage('notes', filteredNotes);
    return true;
  }

  // Library operations
  async getLibraryItems() {
    return loadFromLocalStorage('library_items', []);
  }

  async createLibraryItem(itemData) {
    const items = loadFromLocalStorage('library_items', []);
    const newItem = {
      item_id: generateId('library'),
      ...itemData,
      created_at: new Date().toISOString()
    };
    items.push(newItem);
    saveToLocalStorage('library_items', items);
    return newItem;
  }

  // Competition operations
  async getCompetitions() {
    return loadFromLocalStorage('competitions', []);
  }

  async joinCompetition(competitionId, userId) {
    // Mock implementation - would normally update competition participants
    return { success: true, message: 'Successfully joined competition' };
  }

  async submitCompetition(submissionData) {
    // Mock implementation - would normally calculate score and award prizes
    const score = Math.floor(Math.random() * 100) + 1;
    const placement = Math.floor(Math.random() * 10) + 1;
    const xpEarned = Math.floor(Math.random() * 200) + 50;
    const coinsEarned = Math.floor(Math.random() * 50) + 10;
    
    return {
      score,
      placement,
      xp_earned: xpEarned,
      coins_earned: coinsEarned,
      submitted_at: new Date().toISOString()
    };
  }

  // Shop operations
  async getShopItems() {
    return loadFromLocalStorage('shop_items', []);
  }

  async purchaseItem(itemId, userId) {
    const items = loadFromLocalStorage('shop_items', []);
    const item = items.find(i => i.item_id === itemId);
    if (!item) {
      throw new Error('Item not found');
    }

    const user = await this.getCurrentUser(userId);
    if (user.coins < item.price) {
      throw new Error('Insufficient coins');
    }

    // Update user coins
    await this.updateUser(userId, { coins: user.coins - item.price });
    
    return {
      success: true,
      item,
      remaining_coins: user.coins - item.price
    };
  }

  // Community operations
  async getCommunityServers() {
    const communityData = loadFromLocalStorage('community_data', {});
    return communityData.servers || [];
  }

  async getServerChannels(serverId) {
    const communityData = loadFromLocalStorage('community_data', {});
    const server = communityData.servers?.find(s => s.server_id === serverId);
    return server?.channels || [];
  }

  async getChannelMessages(channelId) {
    const communityData = loadFromLocalStorage('community_data', {});
    return communityData.messages?.filter(m => m.channel_id === channelId) || [];
  }

  async sendMessage(channelId, userId, content) {
    const communityData = loadFromLocalStorage('community_data', {});
    const newMessage = {
      message_id: generateId('message'),
      channel_id: channelId,
      user_id: userId,
      content,
      timestamp: new Date().toISOString(),
      reactions: []
    };
    
    if (!communityData.messages) {
      communityData.messages = [];
    }
    communityData.messages.push(newMessage);
    saveToLocalStorage('community_data', communityData);
    return newMessage;
  }

  // SAT/ACT Practice operations
  async getPracticeStats(userId) {
    // Mock practice statistics
    return {
      total_practice_time: 1250, // minutes
      average_accuracy: 78,
      total_questions_answered: 450,
      strength_areas: ['Algebra', 'Geometry'],
      improvement_areas: ['Reading Comprehension', 'Vocabulary'],
      recent_sessions: [
        {
          date: new Date().toISOString(),
          test_type: 'SAT',
          section: 'Math',
          score: 85,
          time_spent: 45
        }
      ]
    };
  }

  async startPracticeSession(sessionData) {
    return {
      session_id: generateId('session'),
      ...sessionData,
      started_at: new Date().toISOString(),
      status: 'active'
    };
  }

  async submitPracticeAnswer(sessionId, answerData) {
    // Mock answer evaluation
    const isCorrect = Math.random() > 0.3; // 70% correct rate
    return {
      correct: isCorrect,
      explanation: isCorrect ? 'Great job! This is the correct answer.' : 'Not quite. The correct answer is...',
      next_question: {
        question_id: generateId('question'),
        question: 'What is the next question?',
        options: ['A', 'B', 'C', 'D']
      }
    };
  }

  // Strengths assessment operations
  async getStrengthProfile(userId) {
    return {
      strengths: [
        { name: 'Analytical Thinking', score: 85, description: 'Excellent at breaking down complex problems' },
        { name: 'Creative Problem Solving', score: 78, description: 'Good at finding innovative solutions' },
        { name: 'Visual Learning', score: 92, description: 'Learns best through visual aids and diagrams' }
      ],
      career_clusters: [
        { name: 'STEM', match_score: 88, careers: ['Engineer', 'Data Scientist', 'Researcher'] },
        { name: 'Health Sciences', match_score: 76, careers: ['Doctor', 'Nurse', 'Medical Researcher'] }
      ],
      skill_paths: [
        { name: 'Computer Science', progress: 65, next_steps: ['Learn Python', 'Build projects'] },
        { name: 'Mathematics', progress: 78, next_steps: ['Advanced calculus', 'Statistics'] }
      ]
    };
  }

  async saveOnboardingData(userId, onboardingData) {
    // Mock implementation - would normally process onboarding data
    return { success: true, message: 'Onboarding data saved successfully' };
  }

  // AI operations (mock)
  async generateQuiz(content, numQuestions = 5) {
    return {
      quiz_id: generateId('quiz'),
      questions: Array.from({ length: numQuestions }, (_, i) => ({
        id: i + 1,
        question: `Sample question ${i + 1} based on: ${content.substring(0, 50)}...`,
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        correct: Math.floor(Math.random() * 4),
        explanation: `Explanation for question ${i + 1}`
      }))
    };
  }

  async generateFlashcards(content, numCards = 10) {
    return {
      flashcard_id: generateId('flashcard'),
      cards: Array.from({ length: numCards }, (_, i) => ({
        front: `Term ${i + 1} from: ${content.substring(0, 30)}...`,
        back: `Definition ${i + 1} with detailed explanation`,
        example: `Example usage of term ${i + 1}`
      }))
    };
  }

  async summarizeText(content, style = 'concise') {
    const summaries = {
      concise: `Brief summary of: ${content.substring(0, 50)}... Key points highlighted.`,
      detailed: `Detailed summary of: ${content.substring(0, 100)}... All important concepts explained thoroughly.`,
      bullet: `• Key point 1 from text\n• Key point 2 from text\n• Key point 3 from text`
    };
    return {
      summary_id: generateId('summary'),
      summary: summaries[style] || summaries.concise,
      style,
      original_length: content.length,
      summary_length: summaries[style].length
    };
  }
}

// Create singleton instance
const dataService = new DataService();

export default dataService;
