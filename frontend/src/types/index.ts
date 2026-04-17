export interface Admin {
  id: string;
  full_name: string;
  email: string;
  role: "superadmin" | "instructor";
  created_at: string;
  last_login?: string | null;
}

export interface Organisation {
  id: string;
  name: string;
  sector: string;
  contact: string;
  email: string;
  session_count: number;
  created_at: string;
}

export interface Session {
  id: string;
  name: string;
  join_code: string;
  status: "draft" | "ready" | "live" | "ended";
  org_id: string;
  scheduled_at: string | null;
  started_at: string | null;
  ended_at: string | null;
  participants_count: number;
  created_at: string;
}

export interface Participant {
  id: string;
  session_id: string;
  name: string;
  email: string;
  joined_at: string;
}

export interface Challenge {
  id: string;
  title: string;
  category: string;
  type: "scenario" | "ctf" | "quiz" | "decision";
  difficulty: "easy" | "medium" | "hard";
  points: number;
  content: Record<string, any>;
  is_active: boolean;
  is_locked?: boolean;
}

export interface ParticipantScore {
  challenge_title: string;
  base_points: number;
  hint_deductions: number;
  final_points: number;
  solved_at: string | null;
}

export interface LeaderboardEntry {
  name: string;
  total: number;
  rank: number;
  challenges_solved: number;
}

export interface Poll {
  id: string;
  question: string;
  options: { id: string; text: string }[];
  type: "poll" | "quiz" | "decision";
  unlocked_at: string | null;
}

export interface PhishTemplate {
  id: string;
  name: string;
  subject: string;
  body_html: string;
  category: string;
}

export interface PhishStats {
  sent: number;
  opened: number;
  clicked: number;
  submitted: number;
  reported: number;
  opened_rate: number;
  clicked_rate: number;
  submitted_rate: number;
  reported_rate: number;
}

export interface SessionReport {
  id: string;
  status: "generating" | "ready" | "failed";
  storage_path: string | null;
  summary_snapshot: Record<string, any> | null;
  generated_at: string;
}

export type ParticipantJoinResponse = {
  participant_uuid: string;
  session_id: string;
  session_name: string;
  org_name?: string | null;
};
