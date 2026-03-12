/**
 * Mock adapter for axios and fetch when USE_REAL_API is false.
 * Intercepts all API calls and returns mock data so the app is viewable without a backend.
 * Remove or disable when connecting real APIs.
 */

import axios from 'axios';

const API_BASE = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
const API_PREFIX = `${API_BASE}/api`;

// Seed token so AuthProvider has a non-null token on first load
if (typeof localStorage !== 'undefined' && !localStorage.getItem('token')) {
  localStorage.setItem('token', 'mock_token_demo');
}

// ─── Mock data (aligned with dataService shapes where applicable) ───
const mockUser = {
  user_id: 'user_demo_001',
  email: 'demo@taskflow.com',
  name: 'Alex Student',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alex',
  banner: null,
  bio: 'High school student passionate about learning and growth',
  role: 'student',
  xp: 1250,
  coins: 350,
  level: 5,
  is_premium: false,
  avatar_frame: null,
  badges: ['early_adopter', 'week_streak'],
  school_id: 'school_demo_001',
  created_at: new Date().toISOString(),
  // Portfolio / profile page: behavioral stats (visible to visitors)
  consistency_score: 87,
  total_study_hours: 24,
  max_streak: 7,
  // Saved task templates (from "Save as template" on tasks)
  templates: [
    { task_id: 'tpl_1', title: 'Weekly Math Review', description: 'Structured review template for algebra and calculus', category: 'math' },
    { task_id: 'tpl_2', title: 'SAT Reading Practice', description: 'Passage-based reading and vocabulary', category: 'sat_prep' },
    { task_id: 'tpl_3', title: 'Essay Outline', description: 'Introduction, body paragraphs, conclusion', category: 'english' }
  ],
  // Notes the user has made public (shared notes tab)
  shared_notes: [
    { note_id: 'note_shared_1', title: 'Calculus Chapter 5 Notes', folder: 'math', content_preview: 'Derivatives, power rule, chain rule...', updated_at: new Date().toISOString() },
    { note_id: 'note_shared_2', title: 'SAT Vocabulary List', folder: 'sat_prep', content_preview: 'Ephemeral, ubiquitous, pragmatic...', updated_at: new Date().toISOString() }
  ]
};

const genId = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// In-memory stores for mutable mock data (survives only per session)
const mockVisionarySessions = [];
const mockLibrary = [
  {
    item_id: 'library_mock_1',
    item_type: 'quiz',
    title: 'Calculus Basics Quiz',
    content: { questions: [{ id: 1, question: 'What is the derivative of x²?', options: ['2x', 'x²', '2', 'x'], correct: 0, explanation: 'Power rule' }] },
    source_text: 'Basic calculus',
    difficulty: 'medium',
    estimated_time: 10,
    created_at: new Date().toISOString()
  },
  {
    item_id: 'library_mock_2',
    item_type: 'flashcards',
    title: 'SAT Vocabulary Flashcards',
    content: { cards: [{ front: 'Ephemeral', back: 'Lasting for a very short time', example: 'Cherry blossoms are ephemeral.' }] },
    source_text: 'SAT words',
    difficulty: 'medium',
    estimated_time: 15,
    created_at: new Date().toISOString()
  }
];

const mockServers = [
  {
    server_id: 'server_mock_1',
    name: 'Study Hall',
    description: 'General study community for all subjects',
    icon: '📖',
    member_count: 1234,
    is_public: true,
    channels: [
      { channel_id: 'channel_mock_1', name: 'general', description: 'General study discussions', type: 'text' },
      { channel_id: 'channel_mock_2', name: 'homework-help', description: 'Get help with homework', type: 'text' }
    ],
    created_at: new Date().toISOString()
  }
];

// Pre-populated so Community tab shows content
const mockChannelMessages = [
  { message_id: 'msg_1', content: 'Welcome to the channel!', timestamp: new Date(Date.now() - 3600000).toISOString(), user_id: 'user_demo_001' },
  { message_id: 'msg_2', content: 'Anyone working on calculus homework?', timestamp: new Date(Date.now() - 1800000).toISOString(), user_id: 'user_demo_002' },
  { message_id: 'msg_3', content: 'I can help — which problem set?', timestamp: new Date().toISOString(), user_id: mockUser.user_id }
];

const mockStoreItems = [
  { item_id: 'store_1', name: 'Premium Study Planner', description: 'AI-powered planning', price: 499, currency: 'coins', category: 'tools' },
  { item_id: 'store_2', name: 'Energy Boost', description: '5 extra AI calls', price: 50, currency: 'coins', category: 'consumables' }
];

// Pre-populated so Shop/Wishlists tabs show content
const mockWishlists = [
  { wishlist_id: 'wl_mock_1', name: 'Books', items: [{ item_id: 'wi_1', title: 'Calculus textbook', item_url: '', price: '', notes: '' }] },
  { wishlist_id: 'wl_mock_2', name: 'Supplies', items: [{ item_id: 'wi_2', title: 'Notebook', item_url: '', price: '5', notes: '' }] }
];

const mockExchanges = [
  { exchange_id: 'ex_mock_1', name: 'Holiday Exchange', participants: [{ user_id: 'user_demo_001', name: 'Alex Student' }] }
];

// Community server resources/goals/notes (per-server in-memory)
const mockServerResources = [
  { resource_id: 'res_1', title: 'Khan Academy Calculus', resource_type: 'link', url: 'https://www.khanacademy.org/math/calculus-1', content: null }
];
const mockServerGoals = [
  { goal_id: 'goal_1', title: 'Complete Chapter 5', description: 'Finish all practice problems', target: 100, current: 40 }
];
const mockServerNotes = [
  { note_id: 'cnote_1', title: 'Study group notes', content: 'Key formulas and tips from last session.' }
];

const mockSchools = [
  { school_id: 'school_mock_1', name: 'Visionary Academy', description: 'Main school', member_count: 150, created_at: new Date().toISOString() }
];

// Leaderboard for schools (enriched)
const mockLeaderboard = [
  { user_id: 'user_demo_001', name: 'Alex Student', xp: 1250, rank: 1, role: 'student' },
  { user_id: 'user_demo_002', name: 'Sarah Scholar', xp: 980, rank: 2, role: 'teacher' }
];

function getPath(url) {
  if (!url) return '';
  try {
    const u = typeof url === 'string' ? new URL(url, API_BASE) : url;
    return u.pathname || url;
  } catch {
    return String(url);
  }
}

function getMockResponse(path, method, config) {
  const m = (method || 'get').toLowerCase();

  // Auth & profile
  if (path === '/api/auth/me' && m === 'get') {
    return { data: mockUser, status: 200, statusText: 'OK', headers: {}, config };
  }
  if (path === '/api/profile' && m === 'put') {
    const body = typeof config.data === 'string' ? JSON.parse(config.data) : (config.data || {});
    return { data: { ...mockUser, ...body }, status: 200, statusText: 'OK', headers: {}, config };
  }
  if (path.match(/^\/api\/profile\/[^/]+$/) && m === 'get' && path !== '/api/profile/strength') {
    return { data: mockUser, status: 200, statusText: 'OK', headers: {}, config };
  }
  if ((path === '/api/profile/avatar' || path === '/api/profile/banner') && m === 'post') {
    const key = path.includes('avatar') ? 'avatar' : 'banner';
    const url = `https://api.dicebear.com/7.x/avataaars/svg?seed=${Date.now()}`;
    return { data: { [key]: url }, status: 200, statusText: 'OK', headers: {}, config };
  }

  // Visionary AI chat
  if (path === '/api/ai/visionary/sessions' && m === 'get') {
    return { data: mockVisionarySessions, status: 200, statusText: 'OK', headers: {}, config };
  }
  if (path.match(/^\/api\/ai\/visionary\/sessions\/[^/]+$/) && m === 'get') {
    const sessionId = path.split('/').pop();
    const session = mockVisionarySessions.find(s => s.session_id === sessionId) || {
      session_id: sessionId,
      messages: [],
      title: 'Chat',
      created_at: new Date().toISOString()
    };
    return { data: { ...session, messages: session.messages || [] }, status: 200, statusText: 'OK', headers: {}, config };
  }
  if (path.match(/^\/api\/ai\/visionary\/sessions\/[^/]+$/) && m === 'delete') {
    const sessionId = path.split('/').pop();
    const idx = mockVisionarySessions.findIndex(s => s.session_id === sessionId);
    if (idx !== -1) mockVisionarySessions.splice(idx, 1);
    return { data: {}, status: 200, statusText: 'OK', headers: {}, config };
  }
  if (path === '/api/ai/visionary/chat' && m === 'post') {
    const body = typeof config.data === 'string' ? JSON.parse(config.data) : (config.data || {});
    const sessionId = body.session_id || genId('session');
    const isNew = !body.session_id;
    if (isNew) {
      mockVisionarySessions.unshift({
        session_id: sessionId,
        title: (body.message || '').slice(0, 50) + ((body.message || '').length > 50 ? '...' : ''),
        messages: [],
        created_at: new Date().toISOString()
      });
    }
    const response = `This is a mock AI response to: "${(body.message || '').slice(0, 80)}". Connect the real API for live AI.`;
    return {
      data: { session_id: sessionId, response, is_new_session: isNew },
      status: 200,
      statusText: 'OK',
      headers: {},
      config
    };
  }

  // AI StudyHub
  if (path === '/api/ai/summarize' && m === 'post') {
    const body = typeof config.data === 'string' ? JSON.parse(config.data) : (config.data || {});
    const summary = `Mock summary of your content (${(body.content || '').length} chars). Style: ${body.style || 'concise'}.`;
    return { data: { summary }, status: 200, statusText: 'OK', headers: {}, config };
  }
  if (path === '/api/ai/quiz' && m === 'post') {
    const body = typeof config.data === 'string' ? JSON.parse(config.data) : (config.data || {});
    const n = Math.min(Number(body.num_questions) || 5, 10);
    const questions = Array.from({ length: n }, (_, i) => ({
      id: i + 1,
      question: `Sample question ${i + 1} from your content`,
      options: ['A', 'B', 'C', 'D'],
      correct: 0,
      explanation: `Explanation for question ${i + 1}`
    }));
    return { data: { questions }, status: 200, statusText: 'OK', headers: {}, config };
  }
  if (path === '/api/ai/flashcards' && m === 'post') {
    const body = typeof config.data === 'string' ? JSON.parse(config.data) : (config.data || {});
    const n = Math.min(Number(body.num_cards) || 10, 20);
    const cards = Array.from({ length: n }, (_, i) => ({
      front: `Term ${i + 1}`,
      back: `Definition ${i + 1}`,
      example: `Example ${i + 1}`
    }));
    return { data: { cards }, status: 200, statusText: 'OK', headers: {}, config };
  }
  if (path === '/api/ai/analyze-image' && m === 'post') {
    return {
      data: { text: 'Mock extracted text from image. Connect real API for OCR.', summary: 'Mock image summary.' },
      status: 200,
      statusText: 'OK',
      headers: {},
      config
    };
  }

  // Library
  if (path === '/api/library' && m === 'get') {
    return { data: mockLibrary, status: 200, statusText: 'OK', headers: {}, config };
  }
  if (path === '/api/library' && m === 'post') {
    const body = typeof config.data === 'string' ? JSON.parse(config.data) : (config.data || {});
    const item = { item_id: genId('library'), ...body, created_at: new Date().toISOString() };
    mockLibrary.push(item);
    return { data: item, status: 200, statusText: 'OK', headers: {}, config };
  }
  if (path.match(/^\/api\/library\/[^/]+$/) && m === 'delete') {
    const id = path.split('/').pop();
    const idx = mockLibrary.findIndex(i => i.item_id === id);
    if (idx !== -1) mockLibrary.splice(idx, 1);
    return { data: {}, status: 200, statusText: 'OK', headers: {}, config };
  }
  if (path.match(/^\/api\/library\/[^/]+$/) && (m === 'patch' || m === 'put')) {
    const id = path.split('/').pop();
    const body = typeof config.data === 'string' ? JSON.parse(config.data) : (config.data || {});
    const idx = mockLibrary.findIndex(i => i.item_id === id);
    if (idx !== -1) Object.assign(mockLibrary[idx], body);
    return { data: mockLibrary[idx] || {}, status: 200, statusText: 'OK', headers: {}, config };
  }

  // Community: servers, channels
  if (path === '/api/servers' && m === 'get') {
    return { data: mockServers, status: 200, statusText: 'OK', headers: {}, config };
  }
  if (path === '/api/servers/discover/all' && m === 'get') {
    return { data: mockServers, status: 200, statusText: 'OK', headers: {}, config };
  }
  if (path.match(/^\/api\/servers\/[^/]+$/) && m === 'get') {
    const serverId = path.split('/')[3];
    const server = mockServers.find(s => s.server_id === serverId) || mockServers[0];
    return { data: server, status: 200, statusText: 'OK', headers: {}, config };
  }
  if (path.match(/^\/api\/servers\/[^/]+\/resources$/) && m === 'get') {
    return { data: mockServerResources, status: 200, statusText: 'OK', headers: {}, config };
  }
  if (path.match(/^\/api\/servers\/[^/]+\/resources$/) && m === 'post') {
    const body = typeof config.data === 'string' ? JSON.parse(config.data) : (config.data || {});
    const res = { resource_id: genId('res'), ...body };
    mockServerResources.push(res);
    return { data: res, status: 200, statusText: 'OK', headers: {}, config };
  }
  if (path.match(/^\/api\/servers\/[^/]+\/goals$/) && m === 'get') {
    return { data: mockServerGoals, status: 200, statusText: 'OK', headers: {}, config };
  }
  if (path.match(/^\/api\/servers\/[^/]+\/goals$/) && m === 'post') {
    const body = typeof config.data === 'string' ? JSON.parse(config.data) : (config.data || {});
    const goal = { goal_id: genId('goal'), current: 0, ...body };
    mockServerGoals.push(goal);
    return { data: goal, status: 200, statusText: 'OK', headers: {}, config };
  }
  if (path.match(/^\/api\/servers\/[^/]+\/goals\/[^/]+\/contribute$/) && m === 'post') {
    return { data: {}, status: 200, statusText: 'OK', headers: {}, config };
  }
  if (path.match(/^\/api\/servers\/[^/]+\/notes$/) && m === 'get') {
    return { data: mockServerNotes, status: 200, statusText: 'OK', headers: {}, config };
  }
  if (path.match(/^\/api\/servers\/[^/]+\/notes$/) && m === 'post') {
    const body = typeof config.data === 'string' ? JSON.parse(config.data) : (config.data || {});
    const note = { note_id: genId('note'), ...body };
    mockServerNotes.push(note);
    return { data: note, status: 200, statusText: 'OK', headers: {}, config };
  }
  if (path.match(/^\/api\/servers\/[^/]+\/notes\/[^/]+$/) && m === 'put') {
    return { data: {}, status: 200, statusText: 'OK', headers: {}, config };
  }
  if (path.match(/^\/api\/servers\/[^/]+\/ai-goals$/) && m === 'post') {
    return { data: { goals: [] }, status: 200, statusText: 'OK', headers: {}, config };
  }
  if (path === '/api/servers/academy' && m === 'post') {
    const body = typeof config.data === 'string' ? JSON.parse(config.data) : (config.data || {});
    const server = { server_id: genId('server'), name: body.name || 'Academy', description: body.description || '', channels: [], ...body };
    mockServers.push(server);
    return { data: server, status: 200, statusText: 'OK', headers: {}, config };
  }
  if (path === '/api/servers' && m === 'post') {
    const body = typeof config.data === 'string' ? JSON.parse(config.data) : (config.data || {});
    const server = { server_id: genId('server'), name: body.name || 'Server', description: body.description || '', channels: [], ...body };
    mockServers.push(server);
    return { data: server, status: 200, statusText: 'OK', headers: {}, config };
  }
  if (path.match(/^\/api\/servers\/[^/]+\/join$/) && m === 'post') {
    return { data: {}, status: 200, statusText: 'OK', headers: {}, config };
  }
  if (path.match(/^\/api\/servers\/[^/]+\/leave$/) && m === 'post') {
    return { data: {}, status: 200, statusText: 'OK', headers: {}, config };
  }
  if (path.match(/^\/api\/channels\/[^/]+\/messages$/) && m === 'get') {
    return { data: mockChannelMessages, status: 200, statusText: 'OK', headers: {}, config };
  }
  if (path.match(/^\/api\/channels\/[^/]+\/messages$/) && m === 'post') {
    const body = typeof config.data === 'string' ? JSON.parse(config.data) : (config.data || {});
    const msg = { message_id: genId('msg'), content: body.content || '', timestamp: new Date().toISOString(), user_id: mockUser.user_id };
    mockChannelMessages.push(msg);
    return { data: msg, status: 200, statusText: 'OK', headers: {}, config };
  }

  // Store, wishlists, exchanges
  if (path === '/api/store/items' && m === 'get') {
    return { data: mockStoreItems, status: 200, statusText: 'OK', headers: {}, config };
  }
  if (path === '/api/premium/status' && m === 'get') {
    return { data: { is_premium: false }, status: 200, statusText: 'OK', headers: {}, config };
  }
  if (path === '/api/premium/subscribe' && m === 'post') {
    return { data: { ...mockUser, is_premium: true }, status: 200, statusText: 'OK', headers: {}, config };
  }
  if (path === '/api/wishlists' && m === 'get') {
    return { data: mockWishlists, status: 200, statusText: 'OK', headers: {}, config };
  }
  if (path === '/api/wishlists' && m === 'post') {
    const body = typeof config.data === 'string' ? JSON.parse(config.data) : (config.data || {});
    const wl = { wishlist_id: genId('wl'), name: body.name || 'Wishlist', items: [] };
    mockWishlists.push(wl);
    return { data: wl, status: 200, statusText: 'OK', headers: {}, config };
  }
  if (path.match(/^\/api\/wishlists\/[^/]+$/) && m === 'get') {
    const id = path.split('/')[3];
    const wl = mockWishlists.find(w => w.wishlist_id === id) || { wishlist_id: id, name: 'Wishlist', items: [] };
    return { data: wl, status: 200, statusText: 'OK', headers: {}, config };
  }
  if (path === '/api/wishlists/items' && m === 'post') {
    return { data: {}, status: 200, statusText: 'OK', headers: {}, config };
  }
  if (path.match(/^\/api\/wishlists\/items\/[^/]+\/purchase$/) && m === 'post') {
    return { data: {}, status: 200, statusText: 'OK', headers: {}, config };
  }
  if (path === '/api/exchanges' && m === 'get') {
    return { data: mockExchanges, status: 200, statusText: 'OK', headers: {}, config };
  }
  if (path === '/api/exchanges' && m === 'post') {
    const body = typeof config.data === 'string' ? JSON.parse(config.data) : (config.data || {});
    const ex = { exchange_id: genId('ex'), name: body.name || 'Exchange', participants: [] };
    mockExchanges.push(ex);
    return { data: ex, status: 200, statusText: 'OK', headers: {}, config };
  }
  if (path.match(/^\/api\/exchanges\/[^/]+$/) && m === 'get') {
    const id = path.split('/')[3];
    const ex = mockExchanges.find(e => e.exchange_id === id) || { exchange_id: id, name: 'Exchange', participants: [] };
    return { data: ex, status: 200, statusText: 'OK', headers: {}, config };
  }
  if (path.match(/^\/api\/exchanges\/[^/]+\/join$/) && m === 'post') {
    return { data: {}, status: 200, statusText: 'OK', headers: {}, config };
  }

  // Schools
  if (path === '/api/schools' && m === 'get') {
    return { data: mockSchools, status: 200, statusText: 'OK', headers: {}, config };
  }
  if (path.match(/^\/api\/schools\/[^/]+$/) && m === 'get') {
    const schoolId = path.split('/')[3];
    const school = mockSchools.find(s => s.school_id === schoolId) || mockSchools[0];
    return { data: school, status: 200, statusText: 'OK', headers: {}, config };
  }
  if (path.match(/^\/api\/schools\/[^/]+\/leaderboard$/) && m === 'get') {
    return { data: mockLeaderboard, status: 200, statusText: 'OK', headers: {}, config };
  }
  if (path === '/api/schools' && m === 'post') {
    const body = typeof config.data === 'string' ? JSON.parse(config.data) : (config.data || {});
    const school = { school_id: genId('school'), name: body.name || 'School', member_count: 0, ...body };
    mockSchools.push(school);
    return { data: school, status: 200, statusText: 'OK', headers: {}, config };
  }
  if (path.match(/^\/api\/schools\/[^/]+\/join$/) && m === 'post') {
    return { data: {}, status: 200, statusText: 'OK', headers: {}, config };
  }
  if (path === '/api/classes' && m === 'post') {
    const body = typeof config.data === 'string' ? JSON.parse(config.data) : (config.data || {});
    return { data: { class_id: genId('class'), name: body.name || 'Class' }, status: 200, statusText: 'OK', headers: {}, config };
  }

  // Practice & user
  if (path === '/api/practice/stats' && m === 'post') {
    return { data: {}, status: 200, statusText: 'OK', headers: {}, config };
  }
  if (path === '/api/user/upgrade-lite' && m === 'post') {
    return { data: { ...mockUser, is_premium: true }, status: 200, statusText: 'OK', headers: {}, config };
  }

  // Strengths
  if (path === '/api/profile/strength' && m === 'get') {
    return {
      data: {
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
      },
      status: 200,
      statusText: 'OK',
      headers: {},
      config
    };
  }
  if (path === '/api/onboarding' && m === 'post') {
    return { data: { success: true }, status: 200, statusText: 'OK', headers: {}, config };
  }

  // Auth unlock (AuthPage)
  if (path === '/api/auth/unlock/request' && m === 'post') {
    return { data: { message: 'Unlock code sent.', _dev_code: '123456' }, status: 200, statusText: 'OK', headers: {}, config };
  }
  if (path === '/api/auth/unlock/verify' && m === 'post') {
    return { data: { message: 'Account unlocked.' }, status: 200, statusText: 'OK', headers: {}, config };
  }

  return null;
}

// Axios: use request interceptor to inject mock adapter per-request (avoids replacing
// axios.defaults.adapter which is an array in axios v1.x and would throw when called).
axios.interceptors.request.use((config) => {
  const url = config.url || '';
  const fullUrl = config.baseURL ? new URL(config.url || '', config.baseURL).href : url;
  const path = getPath(fullUrl);
  const mock = getMockResponse(path, config.method, config);
  if (mock) {
    config.adapter = () => Promise.resolve(mock);
  }
  return config;
});

// WebSocket mock: Community page opens ws://localhost:8000/ws/... which fails with no backend.
// Replace with a no-op that fires onopen so the UI doesn't hang or flood errors.
const OriginalWebSocket = window.WebSocket;
window.WebSocket = function (url) {
  const ws = {
    readyState: 1,
    close: function () {
      this.readyState = 3;
    },
    send: function () {},
    addEventListener: function () {},
    removeEventListener: function () {}
  };
  setTimeout(() => {
    if (typeof ws.onopen === 'function') ws.onopen({ type: 'open' });
  }, 0);
  return ws;
};

// Fetch wrapper for Success, Pricing, NotesStudio
const originalFetch = window.fetch;
window.fetch = function (url, opts) {
  const urlStr = typeof url === 'string' ? url : (url && url.url);
  if (!urlStr || !urlStr.includes('/api/')) return originalFetch.apply(this, arguments);

  const path = urlStr.includes('http') ? getPath(urlStr) : (urlStr.startsWith('/') ? urlStr : `/${urlStr}`);
  const method = (opts && opts.method) || 'GET';
  const body = opts && opts.body;
  let data = null;
  try {
    if (body && typeof body === 'string') data = JSON.parse(body);
  } catch (_) {}

  // Payments verify (Success.jsx)
  if (path.includes('/api/payments/verify') && method === 'POST') {
    return Promise.resolve(
      new Response(JSON.stringify({ success: true, message: 'Payment verified (mock)' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    );
  }
  // Founders status (Pricing.jsx)
  if (path.includes('/api/founders/status')) {
    return Promise.resolve(
      new Response(
        JSON.stringify({
          is_founder: false,
          tier: null,
          can_claim: false,
          founder_pass_active: false
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );
  }
  // Checkout founder-pass (Pricing.jsx)
  if (path.includes('/api/checkout/founder-pass') && method === 'POST') {
    return Promise.resolve(
      new Response(
        JSON.stringify({ checkout_url: '/success', session_id: 'mock_session' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );
  }
  // Notes save (NotesStudio.jsx)
  if (path.includes('/api/notes/save') && method === 'POST') {
    const noteId = (data && data.note_id) || genId('note');
    return Promise.resolve(
      new Response(
        JSON.stringify({
          note_id: noteId,
          title: (data && data.title) || 'Note',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );
  }
  // Notes suggest-diagram (NotesStudio.jsx - relative URL /api/notes/suggest-diagram)
  if (path.includes('/api/notes/suggest-diagram') && method === 'POST') {
    const mockDiagram = {
      type: 'mindmap',
      nodes: [
        { id: '1', text: 'Main Idea', position: { x: 350, y: 250 }, shape: 'ellipse', color: '#7C3AED' },
        { id: '2', text: 'Topic 1', position: { x: 150, y: 150 }, shape: 'rectangle', color: '#10B981' },
        { id: '3', text: 'Topic 2', position: { x: 550, y: 150 }, shape: 'rectangle', color: '#F59E0B' },
        { id: '4', text: 'Topic 3', position: { x: 150, y: 350 }, shape: 'rectangle', color: '#EF4444' },
        { id: '5', text: 'Topic 4', position: { x: 550, y: 350 }, shape: 'rectangle', color: '#3B82F6' }
      ],
      edges: [
        { from: '1', to: '2' },
        { from: '1', to: '3' },
        { from: '1', to: '4' },
        { from: '1', to: '5' }
      ],
      suggestion: 'Mock diagram. Connect real API for AI-generated diagrams.'
    };
    return Promise.resolve(
      new Response(
        JSON.stringify(mockDiagram),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );
  }

  return originalFetch.apply(this, arguments);
};
