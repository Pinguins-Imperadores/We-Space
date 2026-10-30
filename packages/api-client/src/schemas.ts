export type GameTitle = 'VALORANT' | 'CS2' | 'LOL';
export type CommStyle = 'CLEAN_CALLS' | 'TRYHARD_IGL' | 'CHILL_NO_TILT' | 'OBJECTIVE_FOCUSED';
export type ClipStatus = 'PENDING_UPLOAD' | 'PROCESSING' | 'VERIFIED' | 'FLAGGED_CHEAT' | 'REJECTED';

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
