# Setting Up Real Authentication & XP/Coins System

## ✅ What's Been Changed

The app has been switched from **mock mode** to **real API mode**. This means:
- ✅ Real user authentication (register/login with actual accounts)
- ✅ Real XP and coins that persist in Supabase (PostgreSQL)
- ✅ Real task progress tracking with XP rewards
- ✅ All gamification features now work with real data

## 🚀 Quick Start

### 1. Set Up Supabase

You need a Supabase project:
1. Visit https://supabase.com and create a free project
2. Go to **SQL Editor** and run the contents of `backend/schema.sql`
3. Copy your project URL and service role key from **Settings → API**

### 2. Create Backend Environment File

Create a `.env` file in the `backend/` directory with:

```env
# Supabase Connection
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# JWT Secret (use a strong random string)
JWT_SECRET_KEY=your-super-secret-jwt-key-change-this-in-production

# CORS Origins (where your frontend runs)
CORS_ORIGINS=http://localhost:3000,http://localhost:5173

# AI Features
OPENROUTER_API_KEY=your-openrouter-key

# Google OAuth (optional, for Google sign-in)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/callback

# Optional: Email/SMTP (for account unlock codes)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@visionaryacademy.com
```

### 3. Install Backend Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 4. Start the Backend Server

```bash
cd backend
uvicorn server:app --reload --port 8000
```

The backend will run on `http://localhost:8000`

### 5. Start the Frontend

In a new terminal:

```bash
cd frontend
npm install  # if you haven't already
npm start    # or npm run dev
```

The frontend will run on `http://localhost:3000` (or the port shown)

## 🎮 How XP & Coins Work

### Earning XP & Coins:

1. **Creating Tasks**: +5 XP, +1 coin
2. **Task Progress**: 
   - 0.5 XP per progress point (e.g., 50% progress = 25 XP)
   - Bonus: +25 XP and +5 coins when completing a task (100%)
3. **Competitions**: XP/coins based on performance (difficulty, accuracy, speed)
4. **Missions**: Complete daily/weekly missions for rewards
5. **Other Actions**: Creating templates, saving library items, etc.

### Level System:
- Level 1: 100 XP needed
- Level 2: 150 XP needed (100 + 50)
- Level 3: 200 XP needed (100 + 50*2)
- And so on... (100 + 50*(level-1))

## 🔐 Authentication

### Register a New Account:
1. Go to the login page
2. Click "Register" tab
3. Enter email, password, and name
4. Password requirements:
   - At least 8 characters
   - At least 1 number
   - At least 1 special character
   - Not a common password

### Login:
- Use your registered email and password
- Sessions last 7 days

### Google OAuth:
- Click "Continue with Google" to sign in with your Google account
- Requires GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to be configured

### Account Lockout:
- After 5 failed login attempts, account is locked for 30 minutes
- Use the unlock code feature to unlock early

## 🐛 Troubleshooting

### "Connection refused" or "Network error"
- Make sure the backend server is running on port 8000
- Check that `REACT_APP_BACKEND_URL` in frontend matches your backend URL (defaults to `http://localhost:8000`)

### "Supabase connection failed"
- Check your `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` in the `.env` file
- Make sure the schema has been applied (run `backend/schema.sql` in Supabase SQL Editor)

### "Invalid token" errors
- Try logging out and logging back in
- Clear browser localStorage: `localStorage.clear()` in browser console

### XP/Coins not updating
- Make sure you're logged in with a real account (not mock mode)
- Check browser console for errors
- Verify backend is receiving requests (check backend logs)

## 📝 Notes

- **First time setup**: You'll need to register a new account (mock accounts won't work)
- **Data persistence**: All data (tasks, XP, coins, etc.) is stored in Supabase PostgreSQL
- **Development**: Backend runs with `--reload` flag for auto-restart on code changes

## 🎉 You're All Set!

Now you can:
- Register real accounts
- Earn real XP and coins
- Track your progress across sessions
- All your data persists in the database!
