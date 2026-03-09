-- Visionary Academy: Supabase PostgreSQL Schema
-- Run this in your Supabase SQL Editor to create all tables

-- ============================================================
-- USERS & AUTH
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
    user_id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT,
    name TEXT NOT NULL,
    avatar TEXT,
    banner TEXT,
    bio TEXT,
    xp INTEGER NOT NULL DEFAULT 0,
    coins INTEGER NOT NULL DEFAULT 100,
    energy INTEGER NOT NULL DEFAULT 9,
    level INTEGER NOT NULL DEFAULT 1,
    streak INTEGER NOT NULL DEFAULT 0,
    plan TEXT NOT NULL DEFAULT 'free',
    is_lite_founder BOOLEAN NOT NULL DEFAULT FALSE,
    is_premium BOOLEAN NOT NULL DEFAULT FALSE,
    premium_until TEXT,
    onboarding_complete BOOLEAN NOT NULL DEFAULT FALSE,
    storage_used INTEGER NOT NULL DEFAULT 0,
    storage_used_mb REAL NOT NULL DEFAULT 0,
    storage_limit_mb REAL NOT NULL DEFAULT 50,
    last_energy_reset TEXT,
    avatar_frame TEXT,
    badges TEXT[] NOT NULL DEFAULT '{}',
    school_id TEXT,
    founder_tier TEXT,
    founder_badge TEXT,
    founder_frame TEXT,
    founder_label TEXT,
    founder_paid_at TEXT,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    stripe_session_id TEXT,
    upgraded_at TEXT,
    subscription_ended_at TEXT,
    daily_refines INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer ON users(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_users_founder_tier ON users(founder_tier);
CREATE INDEX IF NOT EXISTS idx_users_xp ON users(xp DESC);

CREATE TABLE IF NOT EXISTS token_blacklist (
    token TEXT PRIMARY KEY,
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_token_blacklist_expires ON token_blacklist(expires_at);

CREATE TABLE IF NOT EXISTS login_attempts (
    email TEXT PRIMARY KEY,
    count INTEGER NOT NULL DEFAULT 0,
    last_attempt TIMESTAMPTZ,
    locked_until TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS user_sessions (
    session_token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(user_id),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);

CREATE TABLE IF NOT EXISTS unlock_codes (
    email TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN NOT NULL DEFAULT FALSE
);

-- ============================================================
-- XP & TRANSACTIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS xp_transactions (
    transaction_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(user_id),
    xp INTEGER NOT NULL DEFAULT 0,
    coins INTEGER NOT NULL DEFAULT 0,
    reason TEXT,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_xp_transactions_user ON xp_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_xp_transactions_created ON xp_transactions(created_at DESC);

-- ============================================================
-- TASKS
-- ============================================================

CREATE TABLE IF NOT EXISTS tasks (
    task_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(user_id),
    title TEXT NOT NULL,
    description TEXT,
    due_date TEXT,
    category TEXT,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    progress INTEGER NOT NULL DEFAULT 0,
    is_template BOOLEAN NOT NULL DEFAULT FALSE,
    check_ins TEXT[] NOT NULL DEFAULT '{}',
    streak INTEGER NOT NULL DEFAULT 0,
    priority TEXT,
    source TEXT,
    tags TEXT[] NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_template ON tasks(is_template);

-- ============================================================
-- NOTES
-- ============================================================

CREATE TABLE IF NOT EXISTS notes (
    note_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(user_id),
    title TEXT NOT NULL,
    content TEXT,
    folder TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notes_user ON notes(user_id);

CREATE TABLE IF NOT EXISTS notes_studio (
    note_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(user_id),
    title TEXT NOT NULL,
    content TEXT,
    canvas_data JSONB,
    template_id TEXT,
    is_draft BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notes_studio_user ON notes_studio(user_id);

-- ============================================================
-- COMMUNITY: SERVERS, CHANNELS, MESSAGES
-- ============================================================

CREATE TABLE IF NOT EXISTS servers (
    server_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    owner_id TEXT NOT NULL,
    badges TEXT[] NOT NULL DEFAULT '{}',
    is_academy BOOLEAN NOT NULL DEFAULT FALSE,
    academy_type TEXT,
    member_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS server_members (
    id SERIAL PRIMARY KEY,
    server_id TEXT NOT NULL REFERENCES servers(server_id),
    user_id TEXT NOT NULL REFERENCES users(user_id),
    role TEXT NOT NULL DEFAULT 'member',
    joined_at TEXT NOT NULL,
    UNIQUE(server_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_server_members_user ON server_members(user_id);
CREATE INDEX IF NOT EXISTS idx_server_members_server ON server_members(server_id);

CREATE TABLE IF NOT EXISTS channels (
    channel_id TEXT PRIMARY KEY,
    server_id TEXT NOT NULL REFERENCES servers(server_id),
    name TEXT NOT NULL,
    channel_type TEXT NOT NULL DEFAULT 'text',
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_channels_server ON channels(server_id);

CREATE TABLE IF NOT EXISTS messages (
    message_id TEXT PRIMARY KEY,
    channel_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    user_name TEXT,
    user_avatar TEXT,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_messages_channel ON messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC);

-- ============================================================
-- WISHLISTS & EXCHANGES
-- ============================================================

CREATE TABLE IF NOT EXISTS wishlists (
    wishlist_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(user_id),
    name TEXT NOT NULL,
    description TEXT,
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_wishlists_user ON wishlists(user_id);

CREATE TABLE IF NOT EXISTS wishlist_items (
    item_id TEXT PRIMARY KEY,
    wishlist_id TEXT NOT NULL REFERENCES wishlists(wishlist_id),
    title TEXT NOT NULL,
    url TEXT,
    price REAL,
    notes TEXT,
    purchased BOOLEAN NOT NULL DEFAULT FALSE,
    purchased_by TEXT,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_wishlist_items_wishlist ON wishlist_items(wishlist_id);

CREATE TABLE IF NOT EXISTS exchanges (
    exchange_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    competition_type TEXT,
    difficulty TEXT,
    start_time TEXT,
    end_time TEXT,
    max_participants INTEGER,
    participant_count INTEGER NOT NULL DEFAULT 0,
    owner_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS exchange_participants (
    id SERIAL PRIMARY KEY,
    exchange_id TEXT NOT NULL REFERENCES exchanges(exchange_id),
    user_id TEXT NOT NULL REFERENCES users(user_id),
    wishlist_id TEXT,
    assigned_to TEXT,
    UNIQUE(exchange_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_exchange_participants_user ON exchange_participants(user_id);

-- ============================================================
-- SCHOOLS & CLASSES
-- ============================================================

CREATE TABLE IF NOT EXISTS schools (
    school_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    school_type TEXT,
    owner_id TEXT NOT NULL,
    member_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS school_members (
    id SERIAL PRIMARY KEY,
    school_id TEXT NOT NULL REFERENCES schools(school_id),
    user_id TEXT NOT NULL REFERENCES users(user_id),
    role TEXT NOT NULL DEFAULT 'member',
    joined_at TEXT NOT NULL,
    UNIQUE(school_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_school_members_school ON school_members(school_id);
CREATE INDEX IF NOT EXISTS idx_school_members_user ON school_members(user_id);

CREATE TABLE IF NOT EXISTS classes (
    class_id TEXT PRIMARY KEY,
    school_id TEXT NOT NULL REFERENCES schools(school_id),
    name TEXT NOT NULL,
    subject TEXT,
    description TEXT,
    teacher_id TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_classes_school ON classes(school_id);

-- ============================================================
-- COMPETITIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS competitions (
    competition_id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    competition_type TEXT,
    difficulty TEXT,
    start_time TEXT,
    end_time TEXT,
    max_participants INTEGER,
    participant_count INTEGER NOT NULL DEFAULT 0,
    owner_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_competitions_created ON competitions(created_at DESC);

CREATE TABLE IF NOT EXISTS competition_participants (
    id SERIAL PRIMARY KEY,
    competition_id TEXT NOT NULL REFERENCES competitions(competition_id),
    user_id TEXT NOT NULL REFERENCES users(user_id),
    joined_at TEXT NOT NULL,
    UNIQUE(competition_id, user_id)
);

CREATE TABLE IF NOT EXISTS competition_submissions (
    submission_id TEXT PRIMARY KEY,
    competition_id TEXT NOT NULL REFERENCES competitions(competition_id),
    user_id TEXT NOT NULL,
    user_name TEXT,
    answer TEXT,
    time_taken REAL,
    accuracy REAL,
    score INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_comp_submissions_comp ON competition_submissions(competition_id);
CREATE INDEX IF NOT EXISTS idx_comp_submissions_score ON competition_submissions(score DESC);

-- ============================================================
-- MISSIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS user_missions (
    mission_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(user_id),
    date TEXT NOT NULL,
    title TEXT NOT NULL,
    xp_reward INTEGER NOT NULL DEFAULT 0,
    coin_reward INTEGER NOT NULL DEFAULT 0,
    mission_type TEXT NOT NULL DEFAULT 'daily',
    target_count INTEGER NOT NULL DEFAULT 1,
    action TEXT,
    progress INTEGER NOT NULL DEFAULT 0,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    claimed BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_user_missions_user_date ON user_missions(user_id, date);

-- ============================================================
-- AI TEMPLATES
-- ============================================================

CREATE TABLE IF NOT EXISTS ai_templates (
    template_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(user_id),
    title TEXT NOT NULL,
    template_type TEXT,
    content TEXT,
    original_content TEXT,
    is_premium BOOLEAN NOT NULL DEFAULT FALSE,
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ai_templates_user ON ai_templates(user_id);

-- ============================================================
-- STUDY GROUP FEATURES
-- ============================================================

CREATE TABLE IF NOT EXISTS shared_resources (
    resource_id TEXT PRIMARY KEY,
    server_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    user_name TEXT,
    title TEXT NOT NULL,
    resource_type TEXT,
    url TEXT,
    content TEXT,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_shared_resources_server ON shared_resources(server_id);

CREATE TABLE IF NOT EXISTS group_goals (
    goal_id TEXT PRIMARY KEY,
    server_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    target INTEGER NOT NULL DEFAULT 0,
    progress INTEGER NOT NULL DEFAULT 0,
    deadline TEXT,
    contributors TEXT[] NOT NULL DEFAULT '{}',
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_group_goals_server ON group_goals(server_id);

CREATE TABLE IF NOT EXISTS collaborative_notes (
    note_id TEXT PRIMARY KEY,
    server_id TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    last_edited_by TEXT,
    editors TEXT[] NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_collaborative_notes_server ON collaborative_notes(server_id);

-- ============================================================
-- LIBRARY
-- ============================================================

CREATE TABLE IF NOT EXISTS library (
    item_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(user_id),
    item_type TEXT,
    title TEXT NOT NULL,
    content TEXT,
    source_text TEXT,
    tags TEXT[] NOT NULL DEFAULT '{}',
    folder TEXT,
    size_mb REAL,
    source_job_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_library_user ON library(user_id);
CREATE INDEX IF NOT EXISTS idx_library_created ON library(created_at DESC);

-- ============================================================
-- PAYMENTS & WALLET
-- ============================================================

CREATE TABLE IF NOT EXISTS founder_payments (
    id SERIAL PRIMARY KEY,
    session_id TEXT UNIQUE,
    user_id TEXT NOT NULL,
    tier TEXT,
    amount_cents INTEGER,
    paid_at TEXT,
    stripe_customer TEXT,
    source TEXT
);

CREATE TABLE IF NOT EXISTS payment_failures (
    id SERIAL PRIMARY KEY,
    payment_intent_id TEXT,
    stripe_customer TEXT,
    error_code TEXT,
    error_message TEXT,
    card_last4 TEXT,
    amount INTEGER,
    currency TEXT,
    failed_at TEXT,
    event_id TEXT
);

CREATE TABLE IF NOT EXISTS wallet_ledger (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(user_id),
    type TEXT,
    amount INTEGER,
    currency TEXT,
    reason TEXT,
    is_founder BOOLEAN,
    storage_delta_mb REAL,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_wallet_ledger_user ON wallet_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_ledger_created ON wallet_ledger(created_at DESC);

-- ============================================================
-- AI JOBS
-- ============================================================

CREATE TABLE IF NOT EXISTS ai_jobs (
    job_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(user_id),
    job_type TEXT NOT NULL,
    input_data TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    stage TEXT,
    output JSONB,
    expires_at TEXT,
    saved BOOLEAN,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ai_jobs_user ON ai_jobs(user_id);

-- ============================================================
-- STRENGTH PROFILES
-- ============================================================

CREATE TABLE IF NOT EXISTS strength_profiles (
    user_id TEXT PRIMARY KEY REFERENCES users(user_id),
    strengths JSONB,
    career_clusters JSONB,
    skill_paths JSONB,
    lock_in_plan JSONB,
    onboarding_data JSONB,
    created_at TEXT
);

-- ============================================================
-- VISIONARY CHAT SESSIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS visionary_sessions (
    session_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(user_id),
    title TEXT,
    messages JSONB NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_visionary_sessions_user ON visionary_sessions(user_id);

-- ============================================================
-- PRACTICE STATS
-- ============================================================

CREATE TABLE IF NOT EXISTS practice_stats (
    stat_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(user_id),
    test_type TEXT,
    section TEXT,
    correct INTEGER NOT NULL DEFAULT 0,
    incorrect INTEGER NOT NULL DEFAULT 0,
    accuracy REAL,
    time_spent INTEGER,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_practice_stats_user ON practice_stats(user_id);

-- ============================================================
-- RPC FUNCTIONS for atomic operations
-- ============================================================

-- Increment a numeric column atomically (replaces MongoDB $inc)
CREATE OR REPLACE FUNCTION increment_field(
    p_table TEXT,
    p_column TEXT,
    p_id_column TEXT,
    p_id_value TEXT,
    p_amount INTEGER
) RETURNS VOID AS $$
BEGIN
    EXECUTE format(
        'UPDATE %I SET %I = COALESCE(%I, 0) + $1 WHERE %I = $2',
        p_table, p_column, p_column, p_id_column
    ) USING p_amount, p_id_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Append a value to a text[] column (replaces MongoDB $push)
CREATE OR REPLACE FUNCTION array_push(
    p_table TEXT,
    p_column TEXT,
    p_id_column TEXT,
    p_id_value TEXT,
    p_value TEXT
) RETURNS VOID AS $$
BEGIN
    EXECUTE format(
        'UPDATE %I SET %I = array_append(COALESCE(%I, ARRAY[]::text[]), $1) WHERE %I = $2',
        p_table, p_column, p_column, p_id_column
    ) USING p_value, p_id_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Append a value only if not already present (replaces MongoDB $addToSet)
CREATE OR REPLACE FUNCTION array_add_to_set(
    p_table TEXT,
    p_column TEXT,
    p_id_column TEXT,
    p_id_value TEXT,
    p_value TEXT
) RETURNS VOID AS $$
BEGIN
    EXECUTE format(
        'UPDATE %I SET %I = CASE WHEN $1 = ANY(COALESCE(%I, ARRAY[]::text[])) THEN %I ELSE array_append(COALESCE(%I, ARRAY[]::text[]), $1) END WHERE %I = $2',
        p_table, p_column, p_column, p_column, p_column, p_id_column
    ) USING p_value, p_id_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Increment with two conditions (for composite keys like group_goals)
CREATE OR REPLACE FUNCTION increment_and_add_contributor(
    p_goal_id TEXT,
    p_amount INTEGER,
    p_contributor TEXT
) RETURNS VOID AS $$
BEGIN
    UPDATE group_goals
    SET progress = COALESCE(progress, 0) + p_amount,
        contributors = CASE
            WHEN p_contributor = ANY(COALESCE(contributors, ARRAY[]::text[]))
            THEN contributors
            ELSE array_append(COALESCE(contributors, ARRAY[]::text[]), p_contributor)
        END
    WHERE goal_id = p_goal_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Append a message to a JSONB array (for visionary_sessions)
CREATE OR REPLACE FUNCTION jsonb_array_push(
    p_table TEXT,
    p_column TEXT,
    p_id_column TEXT,
    p_id_value TEXT,
    p_value JSONB
) RETURNS VOID AS $$
BEGIN
    EXECUTE format(
        'UPDATE %I SET %I = COALESCE(%I, ''[]''::jsonb) || $1 WHERE %I = $2',
        p_table, p_column, p_column, p_id_column
    ) USING p_value, p_id_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
