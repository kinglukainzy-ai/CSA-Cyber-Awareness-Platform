import type { LeaderboardEntry } from "@/types";
import { Trophy, Medal, User } from "lucide-react";
import { Card } from "@/components/ui/Card";

export function Leaderboard({ entries }: { entries: LeaderboardEntry[] }) {
  return (
    <Card className="flex flex-col gap-6 border-none bg-white p-6 shadow-xl shadow-brand-700/5">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-slate-900">Live Leaderboard</h3>
        <Trophy className="h-5 w-5 text-secondary" />
      </div>

      <div className="flex flex-col gap-3">
        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <User className="h-10 w-10 text-slate-200 mb-2" />
            <p className="text-sm font-medium text-slate-400">Waiting for participants to score...</p>
          </div>
        ) : (
          entries.map((entry, index) => (
            <div 
              key={`${entry.rank}-${entry.name}`} 
              className={`flex items-center justify-between rounded-xl px-4 py-3 transition-all ${
                index === 0 ? "bg-brand-700 text-white shadow-lg shadow-brand-700/20" : "bg-slate-50 text-slate-700"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold ${
                  index === 0 ? "bg-white/20" : "bg-white shadow-sm"
                }`}>
                  {index < 3 ? (
                    <Medal className={`h-4 w-4 ${
                      index === 0 ? "text-secondary" : index === 1 ? "text-slate-400" : "text-amber-700"
                    }`} />
                  ) : entry.rank}
                </span>
                <span className="font-bold">{entry.name}</span>
              </div>
              <span className={`text-sm font-black ${index === 0 ? "text-white" : "text-brand-700"}`}>
                {entry.total} PTS
              </span>
            </div>
          ))
        )}
      </div>

      {entries.length > 0 && (
        <p className="text-center text-[10px] uppercase font-black tracking-widest text-slate-300">
          Last updated 1s ago
        </p>
      )}
    </Card>
  );
}
