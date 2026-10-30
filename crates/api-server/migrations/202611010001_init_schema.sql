-- We Space Database Migration v1.0
-- Initial Core Schema: Users, Profiles, Clips, Reviews, Lobbies, and Telemetry

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enums
CREATE TYPE game_title AS ENUM ('VALORANT', 'CS2', 'LOL');
CREATE TYPE comm_style AS ENUM ('CLEAN_CALLS', 'TRYHARD_IGL', 'CHILL_NO_TILT', 'OBJECTIVE_FOCUSED');
CREATE TYPE clip_status AS ENUM ('PENDING_UPLOAD', 'PROCESSING', 'VERIFIED', 'FLAGGED_CHEAT', 'REJECTED');
CREATE TYPE user_role AS ENUM ('PLAYER', 'MODERATOR', 'ADMIN');

-- 1. Users & Credentials
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(32) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'PLAYER',
    karma_score NUMERIC(5,2) NOT NULL DEFAULT 100.00 CHECK (karma_score BETWEEN 0.00 AND 200.00),
    radar_mechanics SMALLINT NOT NULL DEFAULT 50 CHECK (radar_mechanics BETWEEN 0 AND 100),
    radar_comms SMALLINT NOT NULL DEFAULT 50 CHECK (radar_comms BETWEEN 0 AND 100),
    radar_resilience SMALLINT NOT NULL DEFAULT 50 CHECK (radar_resilience BETWEEN 0 AND 100),
    radar_gamesense SMALLINT NOT NULL DEFAULT 50 CHECK (radar_gamesense BETWEEN 0 AND 100),
    radar_leadership SMALLINT NOT NULL DEFAULT 50 CHECK (radar_leadership BETWEEN 0 AND 100),
    failed_login_attempts SMALLINT NOT NULL DEFAULT 0,
    locked_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users (username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

-- 2. Player Game Profiles (for LFG Matchmaking)
CREATE TABLE IF NOT EXISTS player_game_profiles (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    game game_title NOT NULL,
    rank_tier SMALLINT NOT NULL,
    primary_role VARCHAR(32) NOT NULL,
    comm_preferences comm_style[] NOT NULL,
    active_hours_bitmask BIT(24) NOT NULL DEFAULT B'111111111111111111111111',
    looking_for_group BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, game)
);

CREATE INDEX IF NOT EXISTS idx_lfg_matchmaking 
ON player_game_profiles (game, rank_tier, primary_role) 
WHERE looking_for_group = TRUE;

CREATE INDEX IF NOT EXISTS idx_lfg_comm_gin 
ON player_game_profiles USING GIN (comm_preferences) 
WHERE looking_for_group = TRUE;

-- 3. Verified Clips (Auto-Clipper)
CREATE TABLE IF NOT EXISTS clips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    game game_title NOT NULL,
    title VARCHAR(120) NOT NULL,
    status clip_status NOT NULL DEFAULT 'PENDING_UPLOAD',
    r2_object_key TEXT UNIQUE NOT NULL,
    file_sha256 CHAR(64) UNIQUE NOT NULL,
    stego_watermark_hash CHAR(64) NOT NULL,
    gpu_encoder_fingerprint VARCHAR(128) NOT NULL,
    trigger_telemetry JSONB NOT NULL,
    duration_ms INTEGER NOT NULL CHECK (duration_ms BETWEEN 3000 AND 90000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clips_feed ON clips (game, created_at DESC) WHERE status = 'VERIFIED';
CREATE INDEX IF NOT EXISTS idx_clips_author ON clips (author_id, created_at DESC);

-- 4. Post-Match Reputation Reviews (Anti-Brigading & Karma Decay)
CREATE TABLE IF NOT EXISTS match_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lobby_id UUID NOT NULL,
    reviewer_id UUID NOT NULL REFERENCES users(id),
    target_id UUID NOT NULL REFERENCES users(id),
    is_positive BOOLEAN NOT NULL,
    badges VARCHAR(32)[] NOT NULL,
    weight_applied NUMERIC(4,3) NOT NULL DEFAULT 1.000,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT no_self_review CHECK (reviewer_id <> target_id),
    CONSTRAINT unique_review_per_lobby UNIQUE (lobby_id, reviewer_id, target_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_target ON match_reviews (target_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_pair ON match_reviews (reviewer_id, target_id, created_at DESC);

-- 5. Lobbies & Sessions
CREATE TABLE IF NOT EXISTS lobbies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    host_id UUID NOT NULL REFERENCES users(id),
    game game_title NOT NULL,
    max_players SMALLINT NOT NULL DEFAULT 5,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    closed_at TIMESTAMPTZ
);
