-- We Space Database Seed Migration v1.1
-- Dev Seed Data: Competitive Users, Game Profiles, Verified Telemetry Clips, and Match Reviews

-- 1. Insert Initial Competitive Users
INSERT INTO users (
    id, username, email, password_hash, role, karma_score,
    radar_mechanics, radar_comms, radar_resilience, radar_gamesense, radar_leadership
) VALUES 
(
    'a0000000-0000-0000-0000-000000000001',
    'valkyrie_fps',
    'valkyrie@wespace.gg',
    '$argon2id$v=19$m=19456,t=2,p=1$wespace_salt$hashed_password_for_dev_seed_only',
    'PLAYER',
    142.50,
    94, 98, 92, 95, 96
),
(
    'a0000000-0000-0000-0000-000000000002',
    's1mple_mind',
    's1mple@wespace.gg',
    '$argon2id$v=19$m=19456,t=2,p=1$wespace_salt$hashed_password_for_dev_seed_only',
    'PLAYER',
    138.00,
    98, 90, 88, 96, 85
),
(
    'a0000000-0000-0000-0000-000000000003',
    'faker_student',
    'faker@wespace.gg',
    '$argon2id$v=19$m=19456,t=2,p=1$wespace_salt$hashed_password_for_dev_seed_only',
    'PLAYER',
    125.00,
    96, 85, 90, 99, 88
),
(
    'a0000000-0000-0000-0000-000000000004',
    'astra_god',
    'astra@wespace.gg',
    '$argon2id$v=19$m=19456,t=2,p=1$wespace_salt$hashed_password_for_dev_seed_only',
    'PLAYER',
    155.00,
    88, 99, 97, 98, 95
),
(
    'a0000000-0000-0000-0000-000000000005',
    'zywoo_clone',
    'zywoo@wespace.gg',
    '$argon2id$v=19$m=19456,t=2,p=1$wespace_salt$hashed_password_for_dev_seed_only',
    'PLAYER',
    110.00,
    95, 82, 85, 92, 80
)
ON CONFLICT (id) DO NOTHING;

-- 2. Insert Player Game Profiles for LFG Matching
INSERT INTO player_game_profiles (
    user_id, game, rank_tier, primary_role, comm_preferences, looking_for_group
) VALUES
(
    'a0000000-0000-0000-0000-000000000001',
    'VALORANT',
    25, -- Radiant
    'IGL / Iniciador',
    ARRAY['CLEAN_CALLS', 'TRYHARD_IGL']::comm_style[],
    TRUE
),
(
    'a0000000-0000-0000-0000-000000000002',
    'CS2',
    28, -- Faceit Level 10 / Global
    'Sniper / AWP',
    ARRAY['CLEAN_CALLS', 'CHILL_NO_TILT']::comm_style[],
    TRUE
),
(
    'a0000000-0000-0000-0000-000000000003',
    'LOL',
    24, -- Grandmaster
    'Mid Laner / Shotcaller',
    ARRAY['OBJECTIVE_FOCUSED', 'CLEAN_CALLS']::comm_style[],
    TRUE
),
(
    'a0000000-0000-0000-0000-000000000004',
    'VALORANT',
    23, -- Imortal 3
    'Controlador / Smoker',
    ARRAY['CLEAN_CALLS', 'CHILL_NO_TILT', 'OBJECTIVE_FOCUSED']::comm_style[],
    TRUE
),
(
    'a0000000-0000-0000-0000-000000000005',
    'CS2',
    24, -- Premier 24k
    'Entry Fragger / Rifler',
    ARRAY['CLEAN_CALLS']::comm_style[],
    TRUE
)
ON CONFLICT (user_id, game) DO UPDATE SET looking_for_group = TRUE;

-- 3. Insert Authenticated Clips with GPU Telemetry and Watermark Hashes
INSERT INTO clips (
    id, author_id, game, title, status, r2_object_key,
    file_sha256, stego_watermark_hash, gpu_encoder_fingerprint,
    trigger_telemetry, duration_ms
) VALUES
(
    'c0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'VALORANT',
    '1v4 Retake B Site • Clutch Limpo no Overtime',
    'VERIFIED',
    'clips/a0000000-0000-0000-0000-000000000001/c0000000-0000-0000-0000-000000000001.mp4',
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    'NVENC_NVIDIA_GeForce_RTX_4080_Direct3D11',
    '{"trigger_type": "AUDIO_PEAK_AND_KILL", "score": 96.4, "audio_rms_db": -8.2, "wasapi_peak": true}',
    42000
),
(
    'c0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000002',
    'CS2',
    'Inferno Banana AWP 4K • Entry sem Perder HP',
    'VERIFIED',
    'clips/a0000000-0000-0000-0000-000000000002/c0000000-0000-0000-0000-000000000002.mp4',
    'f4c6e7a2b91d4e8c3a1b2c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f',
    'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
    'NVENC_NVIDIA_GeForce_RTX_4090_Direct3D11',
    '{"trigger_type": "CS2_GSI_ROUND_MVP", "score": 98.8, "gsi_kills": 4, "headshot_ratio": 0.75}',
    35000
),
(
    'c0000000-0000-0000-0000-000000000003',
    'a0000000-0000-0000-0000-000000000004',
    'VALORANT',
    'Ascent Mid-to-B Retake • Smokes Perfeitas & Call Limpa',
    'VERIFIED',
    'clips/a0000000-0000-0000-0000-000000000004/c0000000-0000-0000-0000-000000000003.mp4',
    'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2',
    '9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba',
    'AMF_AMD_Radeon_RX_7900_XTX_Direct3D11',
    '{"trigger_type": "MANUAL_BOOKMARK", "score": 91.2, "comms_clarity": 0.98}',
    38000
)
ON CONFLICT (id) DO NOTHING;

-- 4. Insert Verified Peer Reviews (For Anti-Brigading & Karma Weight Testing)
INSERT INTO match_reviews (
    id, lobby_id, reviewer_id, target_id, is_positive, badges, weight_applied
) VALUES
(
    'r0000000-0000-0000-0000-000000000001',
    'l0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000002',
    TRUE,
    ARRAY['CALL_LIMPA', 'CLUTCH_MASTER', 'ZERO_TILT'],
    1.000
),
(
    'r0000000-0000-0000-0000-000000000002',
    'l0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000004',
    'a0000000-0000-0000-0000-000000000001',
    TRUE,
    ARRAY['CALL_LIMPA', 'IGL_SOLIDO', 'ZERO_TILT'],
    1.000
)
ON CONFLICT (id) DO NOTHING;

-- 5. Insert Active LFG Lobbies
INSERT INTO lobbies (
    id, host_id, game, max_players, is_active
) VALUES
(
    'l0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'VALORANT',
    5,
    TRUE
),
(
    'l0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000002',
    'CS2',
    2,
    TRUE
)
ON CONFLICT (id) DO NOTHING;
