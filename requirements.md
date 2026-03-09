# TaskFlow - Productivity Hub

## Original Problem Statement
Build a task tracker app with daily checkboxes, streak tracking, calendar view, and local storage. Take ideas from Monday.com and Notion. Use a clean, mobile-friendly notion style UI with soft colors, progress indicators, and light/dark mode toggle. Also make an slidable bar to see completion rate of tasks. Add on with an ai quiz/flashcard creator, and notes and summarizer, so clone Grammarly.com and vocabulary.com and Quizlet, so people can paste text or upload files or pictures. Clone discord with servers and all. Add a section in the community tab so that it's like elfster.com where people can make wishlists and people can buy people items, with just adding a link in the exchange tab. And server badges. Add a profile section with banners, and uploadable profile picture and a section where people can share their tasks template.

## User Choices
- AI Provider: OpenRouter (Claude, GPT-4o Mini, etc.)
- Image Analysis: OpenRouter with Claude 3.5 Sonnet
- Authentication: JWT + Google OAuth2 (direct)
- Real-time Messaging: WebSocket
- UI Design: Notion-inspired with soft colors

## Architecture

### Backend (FastAPI)
- `/app/backend/server.py` - Main API server with all endpoints
- Supabase (PostgreSQL) tables: users, tasks, notes, servers, channels, messages, wishlists, wishlist_items, exchanges, exchange_participants, user_sessions, server_members, schools, school_members, classes, competitions, competition_participants, competition_submissions, user_missions, xp_transactions, ai_templates, shared_resources, group_goals, collaborative_notes, and more

### Frontend (React)
- `/app/frontend/src/App.js` - Main app with routing and auth context
- `/app/frontend/src/pages/` - All page components
- `/app/frontend/src/components/` - Shared components (Sidebar, UI)

## Features Implemented (Phase 1 - MVP)
1. **Task Tracker**
   - Daily checkboxes with check-in/check-out
   - Streak tracking (consecutive days)
   - Calendar view with activity highlights
   - Progress slider showing completion rate
   - Task categories (default, work, health, learning, personal)
   - Task templates (sharable)

2. **Study Hub (AI-powered)**
   - Text summarizer (concise/detailed/bullet points)
   - Quiz generator (multiple choice/true-false)
   - Flashcard generator
   - File upload (text files)
   - Image text extraction (OpenAI Vision)

3. **Community (Discord-style)**
   - Server creation and management
   - Text channels
   - Real-time WebSocket messaging
   - Server discovery
   - Member list with owner indicator

4. **Wishlists & Exchanges (Elfster-style)**
   - Personal wishlists
   - Add items with URL, price, notes
   - Mark items as purchased
   - Gift exchanges
   - Exchange participants

5. **Profile**
   - Banner image upload
   - Avatar upload
   - Bio editing
   - Shared templates display

6. **Settings**
   - Light/Dark mode toggle
   - Notification preferences
   - Logout

## Features Implemented (Phase 2 - Gamification & Enhanced Features)

7. **Full Gamification System**
   - XP (Experience Points) earned from all actions
   - Coins as in-app currency
   - Levels with progression (100 XP + 50 per level)
   - XP/Level display in sidebar with progress bar
   - Daily & Weekly Missions with rewards
   - Mission claiming system

8. **Task Completion Slider (0-100%)**
   - Progress slider on each task card
   - XP rewards based on progress increase
   - Bonus XP for completing tasks (100%)
   - Visual progress indicator

9. **Competition System**
   - Competition types: Speed, Accuracy, Essay, Study Jam
   - Difficulty levels: Easy, Medium, Hard
   - AI Rewards Engine (computeRewards function)
   - Leaderboards with placements
   - XP/Coin rewards based on performance

10. **Schools & Classes System**
    - Create/Join Schools
    - Create Classes within schools
    - School-specific leaderboards
    - School type categorization

11. **In-App Store (Coming Soon)**
    - Avatar cosmetics (frames, accessories)
    - XP Boosters
    - Study aids
    - Template packs
    - All items marked "Coming Soon"

12. **Premium Subscription**
    - Monthly 500 coin drop
    - Exclusive monthly cosmetic
    - Premium templates access
    - 1.5x XP gain
    - Bonus daily rewards
    - Premium AI modes
    - Premium badge on profile

13. **AI Template Builder**
    - Template types: Notes, Essay, Poster, Slides, Report
    - AI generation with GPT-5.1
    - Template editing and saving
    - Premium template packs

14. **Enhanced Study Groups**
    - Shared Resources panel (links, files, notes)
    - Group Goals with progress tracking
    - Goal contributions from members
    - AI Goal Suggestions (mock)
    - Collaborative Notes editor
    - Real-time note editing

15. **Visual Improvements**
    - Gradient hero headers on Competition, Store, Schools, Templates pages
    - Competition type cards with distinct colors
    - Premium badge styling
    - XP/Coin icons throughout UI

## API Endpoints

### Phase 1 APIs
- Auth: `/api/auth/register`, `/api/auth/login`, `/api/auth/me`, `/api/auth/session`, `/api/auth/logout`
- Tasks: `/api/tasks`, `/api/tasks/{id}`, `/api/tasks/{id}/checkin`, `/api/tasks/{id}/checkout`, `/api/tasks/templates`, `/api/tasks/stats`
- Notes: `/api/notes`, `/api/notes/{id}`
- AI: `/api/ai/summarize`, `/api/ai/quiz`, `/api/ai/flashcards`, `/api/ai/analyze-image`
- Servers: `/api/servers`, `/api/servers/{id}`, `/api/servers/{id}/join`, `/api/servers/{id}/leave`, `/api/servers/discover/all`
- Channels: `/api/channels`, `/api/channels/{id}/messages`
- Wishlists: `/api/wishlists`, `/api/wishlists/{id}`, `/api/wishlists/items`, `/api/wishlists/items/{id}/purchase`
- Exchanges: `/api/exchanges`, `/api/exchanges/{id}`, `/api/exchanges/{id}/join`
- Profile: `/api/profile`, `/api/profile/avatar`, `/api/profile/banner`, `/api/profile/{user_id}`

### Phase 2 APIs
- Task Progress: `/api/tasks/{id}/progress`
- Schools: `/api/schools`, `/api/schools/{id}`, `/api/schools/{id}/join`, `/api/schools/{id}/leaderboard`
- Classes: `/api/classes`
- Competitions: `/api/competitions`, `/api/competitions/{id}`, `/api/competitions/{id}/join`, `/api/competitions/{id}/submit`
- Missions: `/api/missions`, `/api/missions/{id}/claim`
- Store: `/api/store/items`
- Premium: `/api/premium/status`, `/api/premium/subscribe`
- Templates: `/api/templates`, `/api/templates/generate`, `/api/templates/{id}`
- Enhanced Community: `/api/servers/{id}/resources`, `/api/servers/{id}/goals`, `/api/servers/{id}/goals/{id}/contribute`, `/api/servers/{id}/notes`, `/api/servers/{id}/ai-goals`
- Gamification: `/api/gamification/stats`, `/api/gamification/leaderboard`, `/api/gamification/transactions`

## Next Action Items

### Phase 3 Enhancements
1. **Task Features**
   - Recurring tasks (daily, weekly, monthly)
   - Task reminders/notifications
   - Task due dates with alerts
   - Drag-and-drop task reordering

2. **Store Implementation**
   - Implement actual coin spending
   - Unlock items functionality
   - Inventory system for purchased items
   - Equip cosmetics on profile

3. **Competition Enhancements**
   - Real-time competition updates
   - Team competitions
   - Tournament brackets
   - Competition history

4. **Premium Features**
   - Payment integration (Stripe)
   - Premium template pack unlocks
   - Exclusive AI modes

5. **Community Features**
   - Voice channels integration
   - Server roles and permissions
   - Message reactions and replies
   - File/image sharing in chat

6. **General**
   - Push notifications
   - Mobile app (React Native)
   - Data export/import
   - Advanced analytics dashboard

## Environment Variables
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_KEY` - Supabase service role key
- `JWT_SECRET_KEY` - JWT signing key
- `OPENROUTER_API_KEY` - OpenRouter API key for AI features
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
- `CORS_ORIGINS` - Allowed origins
