import { create } from "zustand";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
const SESSION_KEY = 'csa_participant';

export interface ParticipantSession {
  uuid: string;
  session_id: string;
  session_code: string;
  name: string;
  email: string;
  joined_at: number;
}

type ParticipantState = {
  participantUuid: string | null;
  sessionId: string | null;
  sessionCode: string | null;
  name: string | null;
  email: string | null;
  setParticipant: (payload: Partial<ParticipantState>) => void;
  clear: () => void;
};

export const useParticipantStore = create<ParticipantState>((set) => {
  let initialState: Partial<ParticipantState> = {
    participantUuid: null,
    sessionId: null,
    sessionCode: null,
    name: null,
    email: null,
  };

  if (typeof window !== "undefined") {
    const saved = localStorage.getItem(SESSION_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        initialState = {
          participantUuid: parsed.uuid,
          sessionId: parsed.session_id,
          sessionCode: parsed.session_code,
          name: parsed.name,
          email: parsed.email,
        };
      } catch (e) {
        console.error("Failed to parse saved participant", e);
      }
    }
  }

  return {
    ...initialState as ParticipantState,
    setParticipant: (payload) => {
      set((state) => {
        const next = { ...state, ...payload };
        // resolveParticipant is the source of truth
        return next;
      });
    },
    clear: () => {
      if (typeof window !== "undefined") {
        localStorage.removeItem(SESSION_KEY);
      }
      set({ participantUuid: null, sessionId: null, sessionCode: null, name: null, email: null });
    }
  };
});

export async function resolveParticipant(
  sessionCode: string,
  name?: string,
  email?: string
): Promise<ParticipantSession | null> {
  const raw = typeof window !== 'undefined' ? localStorage.getItem(SESSION_KEY) : null;

  if (raw) {
    const stored: ParticipantSession = JSON.parse(raw);
    if (stored.session_code === sessionCode) {
      try {
        const res = await fetch(`${API_URL}/participants/${stored.uuid}/status`, {
          headers: { 'X-Participant-UUID': stored.uuid }
        });

        if (res.ok) {
          const data = await res.json();
          if (data.session_status === 'ended' || !data.is_valid) {
            localStorage.removeItem(SESSION_KEY);
            return null;
          }
          return stored;
        }
      } catch (error) {
        return stored;
      }
    }
    localStorage.removeItem(SESSION_KEY);
  }

  if (!name || !email) return null;

  try {
    const res = await fetch(`${API_URL}/participants/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_code: sessionCode, name, email })
    });

    if (!res.ok) throw new Error("Join failed");

    const participant = await res.json();
    const entry: ParticipantSession = {
      uuid: participant.participant_uuid,
      session_id: participant.session_id,
      session_code: sessionCode,
      name,
      email,
      joined_at: Date.now()
    };

    localStorage.setItem(SESSION_KEY, JSON.stringify(entry));
    return entry;
  } catch (error) {
    return null;
  }
}

export function clearParticipantSession() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(SESSION_KEY);
  }
}