"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useSocket } from "@/providers/SocketProvider";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { BarChart3, CheckCircle2, Loader2, Users, Trophy, XCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface PollOption {
  id: string;
  text: string;
}

interface Poll {
  poll_id: string;
  question: string;
  options: PollOption[];
  type: "poll" | "quiz" | "decision";
  correct_option?: string; // Revealed after results
}

interface PollResults {
  [optionId: string]: number;
}

interface PollWidgetProps {
  sessionId: string;
  participantUuid: string;
}

export function PollWidget({ sessionId, participantUuid }: PollWidgetProps) {
  const { socket } = useSocket();
  const [activePoll, setActivePoll] = useState<Poll | null>(null);
  const [results, setResults] = useState<PollResults | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [canDismiss, setCanDismiss] = useState(false);

  useEffect(() => {
    if (socket) {
      socket.on("poll_launched", (poll: any) => {
        // Map id to poll_id
        const pollData: Poll = {
          poll_id: poll.id || poll.poll_id,
          question: poll.question,
          options: poll.options,
          type: poll.type,
          correct_option: poll.correct_option
        };
        
        setActivePoll(pollData);
        setResults(null);
        setSelectedOption(null);
        setSubmitting(false);
        setShowResults(false);
        setCanDismiss(false);
      });

      socket.on("poll_results", (payload: { poll_id: string; results: PollResults; correct_option?: string }) => {
        if (activePoll && payload.poll_id === activePoll.poll_id) {
          setResults(payload.results);
          setShowResults(true);
          if (payload.correct_option) {
            setActivePoll(prev => prev ? { ...prev, correct_option: payload.correct_option } : null);
          }
          
          // 3 second delay before showing dismiss button
          setTimeout(() => setCanDismiss(true), 3000);
        }
      });
    }

    return () => {
      if (socket) {
        socket.off("poll_launched");
        socket.off("poll_results");
      }
    };
  }, [activePoll, socket]);

  const handleVote = async (optionId: string) => {
    if (!activePoll || selectedOption || submitting) return;
    setSubmitting(true);
    setSelectedOption(optionId);
    
    try {
      await api(`/polls/${activePoll.poll_id}/respond`, {
        method: "POST",
        headers: { 
          "X-Participant-UUID": participantUuid,
          "X-Session-ID": sessionId
        },
        body: JSON.stringify({ 
          answer: { selected: optionId },
          session_id: sessionId
        })
      });
    } catch (err) {
      console.error("Poll submission failed:", err);
      setSelectedOption(null);
      setSubmitting(false);
    }
  };

  if (!activePoll) return null;

  const totalVotes = results ? Object.values(results).reduce((a, b) => a + b, 0) : 0;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[1000] flex items-center justify-center bg-brand-950/95 backdrop-blur-xl p-0 sm:p-8"
      >
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="w-full h-full sm:h-auto sm:max-w-2xl bg-white sm:rounded-3xl shadow-2xl overflow-y-auto"
        >
          {/* Header */}
          <div className="bg-brand-700 p-8 text-white text-center">
            <div className="flex justify-center mb-4">
              <motion.div 
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="bg-white/20 p-4 rounded-2xl backdrop-blur-sm"
              >
                <BarChart3 className="h-10 w-10" />
              </motion.div>
            </div>
            <h2 className="text-3xl font-black tracking-tight uppercase">
              {activePoll.type === 'quiz' ? 'Intelligence Quiz' : 'Team Consensus'}
            </h2>
            <p className="text-brand-100 font-medium text-sm mt-2">Your input is required for the Mission</p>
          </div>

          <div className="p-8 sm:p-12">
            <h3 className="text-3xl font-black text-slate-900 mb-10 leading-tight text-center">
              {activePoll.question}
            </h3>

            {!showResults ? (
              <div className="space-y-4">
                {activePoll.options.map((option) => (
                  <button
                    key={option.id}
                    disabled={submitting || !!selectedOption}
                    onClick={() => handleVote(option.id)}
                    className={`w-full min-h-[64px] p-6 text-center rounded-2xl border-2 font-black text-lg transition-all duration-300 flex items-center justify-center relative
                      ${selectedOption === option.id 
                        ? "border-brand-600 bg-brand-50 text-brand-700" 
                        : "border-slate-100 bg-slate-50 hover:border-brand-300 hover:bg-white hover:shadow-xl hover:-translate-y-1"
                      }
                      ${submitting && selectedOption !== option.id ? "opacity-40 grayscale" : ""}
                    `}
                  >
                    <span>{option.text}</span>
                    {selectedOption === option.id && (
                      <div className="absolute right-6">
                        <Loader2 className="h-6 w-6 animate-spin text-brand-700" />
                      </div>
                    )}
                  </button>
                ))}
                
                {selectedOption && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center gap-4 mt-8"
                  >
                    <div className="flex items-center gap-3 px-6 py-3 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100">
                       <CheckCircle2 className="h-5 w-5" />
                       <span className="font-bold">Response recorded</span>
                    </div>
                    <p className="text-slate-400 font-bold text-xs uppercase tracking-widest animate-pulse">
                      Waiting for command results...
                    </p>
                  </motion.div>
                )}
              </div>
            ) : (
              <div className="space-y-8">
                <div className="space-y-6">
                  {activePoll.options.map((option) => {
                    const count = results?.[option.id] || 0;
                    const percentage = totalVotes > 0 ? (count / totalVotes) * 100 : 0;
                    const isCorrect = activePoll.type === "quiz" && option.id === activePoll.correct_option;
                    const isWrong = activePoll.type === "quiz" && activePoll.correct_option && option.id !== activePoll.correct_option;
                    const isSelected = selectedOption === option.id;

                    return (
                      <div key={option.id} className="relative">
                        <div className="flex justify-between mb-3 items-center">
                          <div className="flex items-center gap-3">
                            <span className={`text-lg font-black ${
                              isCorrect ? "text-emerald-600" : isWrong && isSelected ? "text-red-600" : "text-slate-700"
                            }`}>
                              {option.text}
                            </span>
                            {isSelected && (
                              <span className="text-[10px] font-black bg-slate-900 text-white px-2 py-0.5 rounded-md uppercase tracking-tighter">
                                Your Selection
                              </span>
                            )}
                            {showResults && isCorrect && (
                              <motion.div 
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="bg-emerald-100 p-1 rounded-full"
                              >
                                <Trophy className="h-4 w-4 text-emerald-600" />
                              </motion.div>
                            )}
                          </div>
                          <span className="font-black text-slate-900 text-lg">{Math.round(percentage)}%</span>
                        </div>
                        <div className="h-6 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            transition={{ duration: 0.6, ease: "easeOut" }}
                            className={`h-full rounded-full transition-colors duration-500 ${
                              isCorrect 
                                ? "bg-emerald-500" 
                                : isWrong && isSelected ? "bg-red-500" : isSelected ? "bg-brand-600" : "bg-slate-300"
                            }`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-center items-center gap-6 py-6 border-y border-slate-100">
                  <div className="flex items-center gap-2 text-slate-500 font-bold">
                    <Users className="h-5 w-5" />
                    <span className="text-sm">{totalVotes} Responses</span>
                  </div>
                </div>

                <AnimatePresence>
                  {canDismiss && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <Button 
                        className="w-full h-16 rounded-2xl text-xl font-black shadow-xl shadow-brand-700/20"
                        onClick={() => setActivePoll(null)}
                      >
                        CLOSE MISSION DATA
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
