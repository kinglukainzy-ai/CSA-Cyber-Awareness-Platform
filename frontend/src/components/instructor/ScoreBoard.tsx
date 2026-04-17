"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { socket } from "@/lib/socket";
import { Card } from "@/components/ui/Card";
import { Trophy, Medal, User, TrendingUp } from "lucide-react";
import type { LeaderboardEntry } from "@/types";

export function ScoreBoard({ sessionId }: { sessionId: string }) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);

  const fetchScoreboard = useCallback(async () => {
    try {
      const data = await api<LeaderboardEntry[]>(`/sessions/${sessionId}/leaderboard`);
      setEntries(data);
    } catch (err) {
      console.error(err);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchScoreboard();

    const handleUpdate = (payload: { leaderboard: LeaderboardEntry[] }) => {
      setEntries(payload.leaderboard);
    };

    socket.on("leaderboard_update", handleUpdate);

    return () => {
      socket.off("leaderboard_update", handleUpdate);
    };
  }, [sessionId, fetchScoreboard]);

  return (
    <Card className="flex flex-col gap-8 p-8 border-none shadow-xl shadow-brand-700/5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-700 text-white shadow-lg shadow-brand-700/20">
            <Trophy className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900">Live Scoring</h3>
            <p className="text-xs font-medium text-slate-500">Participant performance stream</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 h-[480px] overflow-y-auto pr-2">
        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center opacity-30">
            <User className="h-10 w-10 mb-2" />
            <p className="text-sm font-bold">No scoring data yet</p>
          </div>
        ) : (
          entries.map((entry, index) => (
            <div 
              key={`${entry.rank}-${entry.name}`} 
              className={`flex items-center justify-between rounded-2xl px-5 py-4 transition-all ${
                index < 3 ? "bg-slate-900 text-white shadow-xl shadow-slate-900/10 scale-[1.02] border-b-2 border-brand-700/30" : "bg-slate-50 text-slate-700 border border-slate-100"
              }`}
            >
              <div className="flex items-center gap-4">
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-black ${
                  index === 0 ? "bg-secondary text-secondary-foreground" : 
                  index === 1 ? "bg-slate-200 text-slate-700" :
                  index === 2 ? "bg-amber-100/20 text-amber-500" : "bg-white/10 text-slate-400"
                }`}>
                  {index < 3 ? <Medal className="h-5 w-5" /> : entry.rank}
                </span>
                <div className="flex flex-col">
                  <span className="font-black tracking-tight">{entry.name}</span>
                  <span className="text-[10px] font-bold opacity-60 uppercase">
                    {index === 0 ? "Current Leader" : `Position #${entry.rank}`}
                  </span>
                </div>
              </div>
              
              <div className="flex flex-col items-end">
                <span className={`text-xl font-black ${index === 0 ? "text-secondary" : "text-brand-700"}`}>
                  {entry.total}
                </span>
                <div className="flex items-center gap-1 text-[10px] font-black uppercase text-emerald-500">
                  <TrendingUp className="h-3 w-3" /> STABLE
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {entries.length > 0 && (
        <div className="flex items-center justify-center gap-2 rounded-2xl bg-slate-50 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
          <div className="h-1.5 w-1.5 rounded-full bg-brand-700 animate-pulse" />
          Real-time updates enabled
        </div>
      )}
    </Card>
  );
}
