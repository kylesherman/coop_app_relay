// Core types for the application

export interface User {
  id: string;
  email?: string;
  first_name: string;
  last_name: string;
  username: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Coop {
  id: string;
  name: string;
  description?: string;
  created_by: string;
  total_eggs_laid: number;
  created_at: string;
  updated_at: string;
}

export interface CoopMember {
  user_id: string;
  coop_id: string;
  role: 'owner' | 'member';
  joined_at: string;
  user?: User;
}

export interface Snapshot {
  id: string;
  coop_id: string;
  relay_id?: string;
  image_path: string;
  created_at: string;
  egg_detections?: EggDetection[];
}

export interface EggDetection {
  id: string;
  snapshot_id: string;
  egg_count: number;
  newly_detected: number;
  model_used: string;
  confidence: number;
  detected_at: string;
  snapshot?: Snapshot;
}

export interface Relay {
  id: string;
  coop_id: string;
  name: string;
  pairing_code: string;
  status: 'pending' | 'active' | 'inactive';
  last_seen_at: string;
  created_at: string;
  updated_at: string;
}

export interface UserSettings {
  user_id: string;
  push_enabled: boolean;
  frequency: 'real_time' | 'daily_summary' | 'off';
  dark_mode: boolean;
  created_at: string;
  updated_at: string;
}

// API Response types
export interface ApiResponse<T> {
  data: T;
  error: string | null;
  status: number;
}

// Navigation types
export type RootStackParamList = {
  index: undefined;
  onboarding: undefined;
  home: undefined;
  history: undefined;
  nestcam: undefined;
  settings: undefined;
  coop: { coopId: string };
  'coop/invite': { coopId: string; inviteCode: string };
  'camera/fullscreen': { snapshotId: string };
};
