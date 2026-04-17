"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { ShieldCheck, Trophy, Target, Users, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { useSocket } from "@/providers/SocketProvider";
import { clearParticipantSession } from "@/lib/participant-store";
import { Logo } from "@/components/shared/Logo";

interface SessionEndScreenProps {
  participantUuid: string;
  sessionId: string;
}

interface ScoreData {
  score: number;
  rank: number;
  total_participants: number;
  solved_count: number;
  total_challenges: number;
}

export function SessionEndScreen({ participantUuid, sessionId }: SessionEndScreenProps) {
  const { socket } = useSocket();
  const [data, setData] = useState<ScoreData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchScore = async () => {
      try {
        const scoreData = await api<ScoreData>(`/sessions/${sessionId}/participants/${participantUuid}/score`);
        setData(scoreData);
      } catch (err) {
        console.error("Failed to fetch score:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchScore();
    clearParticipantSession();
    
    if (socket) {
      // Remove all listeners
      socket.off("session_status");
      socket.off("challenge_unlocked");
      socket.off("leaderboard_update");
      socket.off("poll_launched");
      socket.off("poll_results");
      socket.disconnect();
    }

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [participantUuid, sessionId, socket]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <Logo />
          <div className="h-1 w-32 overflow-hidden rounded-full bg-slate-100">
            <motion.div 
              className="h-full bg-brand-700"
              animate={{ x: [-128, 128] }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            />
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Compiling final debrief...</p>
        </div>
      </div>
    );
  }

  const scorePercentage = data ? (data.solved_count / (data.total_challenges || 1)) * 100 : 0;
  const showConfetti = scorePercentage > 70;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-50 overflow-y-auto">
      <div className="min-h-screen flex flex-col items-center justify-center p-6 sm:p-12 relative overflow-hidden">
        {/* Confetti-like background if score is high */}
        {showConfetti && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
             {Array.from({ length: 40 }).map((_, i) => (
               <motion.div
                 key={i}
                 className="absolute w-2 h-2 rounded-full"
                 style={{ 
                   backgroundColor: ['#0ea5e9', '#6366f1', '#10b981', '#f59e0b', '#ef4444'][i % 5],
                   left: `${Math.random() * 100}%`,
                   top: `-10px`
                 }}
                 animate={{ 
                   y: ['0vh', '110vh'],
                   x: [0, (Math.random() - 0.5) * 200],
                   rotate: [0, 360]
                 }}
                 transition={{ 
                   duration: 2 + Math.random() * 3,
                   repeat: Infinity,
                   delay: Math.random() * 2,
                   ease: "linear"
                 }}
               />
             ))}
          </div>
        )}

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-2xl relative z-10"
        >
          <div className="flex justify-center mb-8">
            <Logo />
          </div>

          <Card className="border-none shadow-2xl p-8 sm:p-12 text-center bg-white relative overflow-hidden">
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex flex-col items-center gap-6"
            >
              <div className="h-24 w-24 rounded-3xl bg-brand-700 grid place-items-center shadow-lg shadow-brand-700/20">
                <ShieldCheck className="h-12 w-12 text-white" />
              </div>
              
              <div className="space-y-2">
                <h1 className="text-4xl font-black text-slate-900 tracking-tight">Session Complete</h1>
                <p className="text-slate-500 font-medium">Your organisation's security posture has been updated.</p>
              </div>
            </motion.div>

            <div className="grid sm:grid-cols-3 gap-4 mt-12">
              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="bg-slate-50 rounded-2xl p-6 flex flex-col items-center gap-2"
              >
                <div className="h-10 w-10 rounded-xl bg-brand-100 grid place-items-center mb-2">
                  <Trophy className="h-5 w-5 text-brand-700" />
                </div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Final Score</p>
                <p className="text-3xl font-black text-brand-700">{data?.score || 0}</p>
              </motion.div>

              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="bg-slate-50 rounded-2xl p-6 flex flex-col items-center gap-2"
              >
                <div className="h-10 w-10 rounded-xl bg-orange-100 grid place-items-center mb-2">
                  <Users className="h-5 w-5 text-orange-600" />
                </div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Rank</p>
                <p className="text-3xl font-black text-slate-900">#{data?.rank || '-'}</p>
                <p className="text-[10px] font-bold text-slate-400">out of {data?.total_participants || 0}</p>
              </motion.div>

              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="bg-slate-50 rounded-2xl p-6 flex flex-col items-center gap-2"
              >
                <div className="h-10 w-10 rounded-xl bg-emerald-100 grid place-items-center mb-2">
                  <Target className="h-5 w-5 text-emerald-600" />
                </div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Missions</p>
                <p className="text-3xl font-black text-slate-900">{data?.solved_count}/{data?.total_challenges}</p>
                <p className="text-[10px] font-bold text-slate-400">Solved</p>
              </motion.div>
            </div>

            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="mt-12 pt-12 border-t border-slate-100 flex flex-col items-center gap-6"
            >
              <p className="text-slate-600 text-sm leading-relaxed max-w-md italic">
                "Thank you for participating. Your organisation's report will be shared by CSA shortly."
              </p>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => window.location.href = '/'}
                className="flex items-center gap-2 px-8 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm shadow-xl hover:bg-slate-800 transition-all"
              >
                Return to Landing <ArrowRight className="h-4 w-4" />
              </motion.button>
            </motion.div>
          </Card>

          <div className="mt-8 flex justify-center">
            <div className="flex items-center gap-2 text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em]">
              <ShieldCheck className="h-4 w-4" />
              Verified by CSA Platform
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
