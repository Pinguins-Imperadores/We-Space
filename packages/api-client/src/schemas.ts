import { z } from 'zod';

export type GameTitle = 'VALORANT' | 'CS2' | 'LOL';
export type CommStyle = 'CLEAN_CALLS' | 'TRYHARD_IGL' | 'CHILL_NO_TILT' | 'OBJECTIVE_FOCUSED';
export type ClipStatus = 'PENDING_UPLOAD' | 'PROCESSING' | 'VERIFIED' | 'FLAGGED_CHEAT' | 'REJECTED';

// --- Zod Validation Schemas (Strict Input Sanitization & AppSec Hardening) ---

export const usernameSchema = z
  .string()
  .trim()
  .min(3, 'Username must be at least 3 characters')
  .max(24, 'Username cannot exceed 24 characters')
  .regex(
    /^[a-zA-Z0-9_-]+$/,
    'Username may only contain letters, numbers, underscores, and hyphens'
  );

export const emailSchema = z
  .string()
  .trim()
  .email('Invalid email address')
  .max(100, 'Email cannot exceed 100 characters');

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password cannot exceed 128 characters');

export const safeUrlSchema = z
  .string()
  .trim()
  .url('Must be a valid URL')
  .refine(
    (url) => url.startsWith('https://') || url.startsWith('http://'),
    'Only HTTP/HTTPS URLs are permitted'
  )
  .refine(
    (url) => !url.toLowerCase().includes('javascript:') && !url.toLowerCase().includes('data:'),
    'Dangerous URL schemes are forbidden'
  );

export const loginSchema = z.object({
  username_or_email: z.string().trim().min(3).max(100),
  password: z.string().min(6).max(128),
});

export const registerSchema = z.object({
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
});

export const createClipIntentSchema = z.object({
  game: z.enum(['VALORANT', 'CS2', 'LOL']),
  title: z
    .string()
    .trim()
    .min(1, 'Title cannot be empty')
    .max(100, 'Title cannot exceed 100 characters')
    .refine((val) => !/[<>]/.test(val), 'HTML tags are forbidden in title'),
  file_sha256: z
    .string()
    .trim()
    .regex(/^[a-fA-F0-9]{64}$/, 'Must be a 64-character SHA-256 hex string'),
  stego_watermark_hash: z.string().trim().max(128),
  gpu_encoder_fingerprint: z.string().trim().max(128),
  trigger_telemetry: z.record(z.string(), z.unknown()),
  duration_ms: z.number().int().min(1000).max(180000),
});

export const reviewSchema = z.object({
  lobby_id: z.string().uuid('Invalid lobby ID'),
  target_id: z.string().uuid('Invalid target player ID'),
  is_positive: z.boolean(),
  badges: z
    .array(
      z
        .string()
        .trim()
        .max(50, 'Badge name too long')
        .refine((b) => !/[<>]/.test(b), 'HTML forbidden in badge name')
    )
    .max(5, 'Maximum 5 badges per review'),
});

export const chatMessageSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, 'Message cannot be empty')
    .max(500, 'Message cannot exceed 500 characters')
    .refine((msg) => !/[<>]/.test(msg), 'HTML tags forbidden in chat'),
});

// --- TypeScript Contracts ---

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreateClipIntentInput = z.infer<typeof createClipIntentSchema>;
export type ReviewInput = z.infer<typeof reviewSchema>;
export type ChatMessageInput = z.infer<typeof chatMessageSchema>;

export interface AuthResponse {
  access_token: string;
  token_type: string;
  expires_in_seconds: number;
  user_id: string;
  username: string;
  role: string;
}

export interface LfgPlayerProfile {
  user_id: string;
  username: string;
  game: GameTitle;
  rank_tier: number;
  primary_role: string;
  comm_preferences: CommStyle[];
  karma_score: number;
  looking_for_group: boolean;
}

export interface ClipResponse {
  id: string;
  author_id: string;
  author_username: string;
  game: GameTitle;
  title: string;
  status: ClipStatus;
  video_url: string;
  file_sha256: string;
  trigger_telemetry: Record<string, unknown>;
  duration_ms: number;
  created_at: string;
}

export interface PresignedUploadResponse {
  clip_id: string;
  upload_url: string;
  r2_object_key: string;
  required_headers: Record<string, string>;
}

export interface ReviewOutcomeResponse {
  review_id: string;
  delta_karma: number;
  weight_applied: number;
  new_target_karma: number;
}
