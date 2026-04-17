"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useSocket } from "@/providers/SocketProvider";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { 
  BarChart3, 
  Play, 
  Users,
  Trophy,
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle2,
  Lock
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface PollOption {
  id: string;
  text: string;
}

interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  type: "poll" | "quiz" | "decision";
  order_num: number;
  is_unlocked: boolean;
  results?: { [key: string]: number };
  correct_option?: string;
}

interface PollControllerProps {
  sessionId: string;
  totalParticipants: number;
}

export function PollController({ sessionId, totalParticipants }: PollControllerProps) {
  const { socket } = useSocket();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [expandedPollId, setExpandedPollId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPolls = async () => {
    try {
      const data = await api<Poll[]>(`/sessions/${sessionId}/polls`);
      setPolls(data);
    } catch (err) {
      console.error("Failed to fetch polls:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolls();

    if (socket) {
      // Listen for live results updates
      socket.on("poll_results", (payload: { poll_id: string; results: { [key: string]: number } }) => {
        setPolls(prev => prev.map(p => 
          p.id === payload.poll_id ? { ...p, results: payload.results } : p
        ));
      });
    }

    return () => {
      if (socket) {
        socket.off("poll_results");
      }
    };
  }, [sessionId, socket]);

  const handleLaunch = async (pollId: string) => {
    try {
      await api(`/polls/${pollId}/launch`, { method: "POST" });
      setPolls(prev => prev.map(p => 
        p.id === pollId ? { ...p, is_unlocked: true } : p
      ));
      setExpandedPollId(pollId);
    } catch (err) {
      console.error("Failed to launch poll:", err);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-400">Loading mission polls...</div>;

  return (
    <Card className="flex flex-col gap-6 p-6 border-none shadow-xl shadow-brand-700/5 bg-white/50 backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-700 text-white shadow-lg shadow-brand-700/20">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900 leading-tight">Poll Engagement</h3>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-widest">Live Audience Intel</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {polls.map((poll) => {
          const isExpanded = expandedPollId === poll.id;
          const totalResponses = poll.results ? Object.values(poll.results).reduce((a, b) => a + b, 0) : 0;
          
          return (
            <div 
              key={poll.id} 
              className={`rounded-2xl border-2 transition-all duration-300 ${
                isExpanded ? "border-brand-600 bg-white" : "border-slate-50 bg-slate-50/30 hover:border-slate-200"
              }`}
            >
              <div className="p-4 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-black bg-slate-200 text-slate-600 px-2 py-0.5 rounded uppercase">
                      {poll.type}
                    </span>
                    {poll.is_unlocked ? (
                      <span className="flex items-center gap-1 text-[10px] font-black text-emerald-600 uppercase">
                        <CheckCircle2 className="h-3 w-3" /> Live
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] font-black text-slate-400 uppercase">
                        <Lock className="h-3 w-3" /> Locked
                      </span>
                    )}
                  </div>
                  <h4 className="font-bold text-slate-800 truncate">{poll.question}</h4>
                </div>
                
                <div className="flex items-center gap-2">
                  {!poll.is_unlocked && (
                    <Button 
                      size="sm" 
                      onClick={() => handleLaunch(poll.id)}
                      className="gap-1.5 font-bold h-9"
                    >
                      <Play className="h-4 w-4 fill-current" /> Launch
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpandedPollId(isExpanded ? null : poll.id)}
                    className="h-9 w-9 p-0 rounded-full"
                  >
                    {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </Button>
                </div>
              </div>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 pt-0 border-t border-slate-50">
                      <div className="mt-4 space-y-3">
                        {poll.options.map((option) => {
                          const count = poll.results?.[option.id] || 0;
                          const percentage = totalResponses > 0 ? (count / totalResponses) * 100 : 0;
                          const isCorrect = poll.type === "quiz" && option.id === poll.correct_option;

                          return (
                            <div key={option.id} className="space-y-1.5">
                              <div className="flex justify-between text-xs font-bold">
                                <span className="flex items-center gap-1.5 text-slate-600">
                                  {option.text}
                                  {isCorrect && <Trophy className="h-3 w-3 text-emerald-500" />}
                                </span>
                                <span className="text-slate-900">{count} ({Math.round(percentage)}%)</span>
                              </div>
                              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${percentage}%` }}
                                  className={`h-full rounded-full ${isCorrect ? "bg-emerald-500" : "bg-brand-600"}`}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      
                      <div className="mt-4 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5" />
                          {totalResponses} / {totalParticipants} Responded
                        </div>
                        {poll.is_unlocked && (
                          <div className="flex items-center gap-1.5 animate-pulse text-brand-700">
                            <Clock className="h-3.5 w-3.5" /> Live Tracking
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
