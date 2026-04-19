"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Lightbulb, Lock, Unlock, Loader2, MinusCircle } from "lucide-react";

interface Hint {
  id: number;
  order_num: number;
  point_cost: number;
  riddle_text: string | null;
  is_unlocked: boolean;
}

interface HintDrawerProps {
  challengeId: string;
  sessionId: string;
  participantUuid: string;
}

export function HintDrawer({ challengeId, sessionId, participantUuid }: HintDrawerProps) {
  const [hints, setHints] = useState<Hint[]>([]);
  const [loading, setLoading] = useState(true);
  const [unlocking, setUnlocking] = useState<number | null>(null);

  const fetchHints = async () => {
    try {
      const data = await api<Hint[]>(`/hints/${challengeId}`, {
        headers: { 
          "X-Participant-UUID": participantUuid,
          "X-Session-ID": sessionId
        }
      });
      setHints(data);
    } catch (err) {
      console.error("Failed to fetch hints:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHints();
  }, [challengeId, participantUuid]);

  const handleUnlock = async (hintId: number) => {
    setUnlocking(hintId);
    try {
      const response = await api<{ riddle_text: string }>(`/hints/unlock`, {
        method: "POST",
        headers: { 
          "X-Participant-UUID": participantUuid,
          "X-Session-ID": sessionId
        },
        body: JSON.stringify({ hint_id: hintId, session_id: sessionId })
      });
      
      // Update local state
      setHints(prev => prev.map(h => 
        h.id === hintId ? { ...h, riddle_text: response.riddle_text, is_unlocked: true } : h
      ));
    } catch (err) {
      console.error("Failed to unlock hint:", err);
    } finally {
      setUnlocking(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-6">
        <Loader2 className="h-6 w-6 animate-spin text-brand-700" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 text-slate-900 border-b pb-3">
        <div className="rounded-full bg-secondary/10 p-2">
          <Lightbulb className="h-5 w-5 text-secondary" />
        </div>
        <div>
          <h3 className="font-bold text-lg">Mission Intelligence</h3>
          <p className="text-xs text-slate-500 font-medium">Unlock hints to progress if you're stuck.</p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {hints.map((hint, index) => (
          <Card key={hint.id} className={`p-4 transition-all duration-300 ${
            hint.is_unlocked 
              ? "border-emerald-200 bg-emerald-50/30 shadow-sm" 
              : "border-slate-200 bg-white hover:border-slate-300"
          }`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    INTEL #{hint.order_num}
                  </span>
                  {hint.is_unlocked ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                      <Unlock className="h-3 w-3" /> DECLASSIFIED
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                      <Lock className="h-3 w-3" /> ENCRYPTED
                    </span>
                  )}
                </div>

                {hint.is_unlocked ? (
                  <p className="text-sm font-medium text-slate-700 leading-relaxed italic animate-in fade-in slide-in-from-top-1">
                    &ldquo;{hint.riddle_text}&rdquo;
                  </p>
                ) : (
                  <p className="text-sm text-slate-400 font-medium">Decrypt this signal for actionable intelligence.</p>
                )}
              </div>

              {!hint.is_unlocked && (
                <Button 
                  variant="outline" 
                  className="h-10 shrink-0 gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 font-bold"
                  disabled={unlocking !== null || (index > 0 && !hints[index-1].is_unlocked)}
                  onClick={() => handleUnlock(hint.id)}
                >
                  {unlocking === hint.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <MinusCircle className="h-4 w-4" />
                      {hint.point_cost} PTS
                    </>
                  )}
                </Button>
              )}
            </div>
          </Card>
        ))}
        
        {hints.length === 0 && (
          <div className="py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <p className="text-sm font-medium text-slate-400 italic">
              No intelligence signals detected for this mission.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
