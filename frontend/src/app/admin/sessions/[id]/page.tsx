"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { socket } from "@/lib/socket";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Monitor,
  FileText,
  Users,
  Calendar,
  ChevronLeft,
  ArrowRight,
  Loader2,
  ShieldCheck,
  Activity,
  Copy,
  CheckCircle2,
  Clock,
  Play,
  Square,
  Unlock,
  Plus,
  Trash2,
  GripVertical,
  LogOut,
  Trophy,
  History,
  LayoutDashboard,
  Settings,
  AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { PhishTracker } from "@/components/instructor/PhishTracker";
import { PollController } from "@/components/instructor/PollController";
import { ScoreBoard } from "@/components/instructor/ScoreBoard";

interface SessionDetail {
  id: string;
  name: string;
  join_code: string;
  status: "draft" | "ready" | "live" | "ended";
  org_id?: string;
  scheduled_at?: string;
  started_at?: string;
  ended_at?: string;
  created_at: string;
}

interface Challenge {
  id: string;
  title: string;
  category: string;
  points: number;
  order_num: number;
  unlocked_at?: string | null;
  solved_count?: number;
}

interface ParticipantEntry {
  id: string;
  name: string;
  joined_at: string;
  score: number;
}

export default function SessionDashboard() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [participants, setParticipants] = useState<ParticipantEntry[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState("0s");

  const fetchData = useCallback(async () => {
    try {
      const data = await api<any>(`/sessions/${id}`);
      setSession(data.session);
      setChallenges(data.challenges || []);
      setParticipants(data.participants_list || []); // Assuming we add participants_list to backend response
      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch session data:", err);
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();

    socket.emit("join_room", { session_id: id, role: "instructor" });

    socket.on("participant_joined", (payload) => {
      fetchData(); // Simplest way to refresh lists
      setActivity(prev => [{ type: 'join', name: payload.name, time: new Date() }, ...prev].slice(0, 100));
    });

    socket.on("challenge_unlocked", (payload) => {
      setChallenges(prev => prev.map(c => c.id === payload.challenge_id ? { ...c, unlocked_at: new Date().toISOString() } : c));
      setActivity(prev => [{ type: 'unlock', id: payload.challenge_id, time: new Date() }, ...prev].slice(0, 100));
    });

    socket.on("phish_event", (payload) => {
      setActivity(prev => [{ type: 'phish', ...payload, time: new Date() }, ...prev].slice(0, 100));
    });

    socket.on("leaderboard_update", (payload) => {
      // Leaderboard updates ScoreBoard component internally, but we might want to refresh participants list
      fetchData();
    });

    return () => {
      socket.off("participant_joined");
      socket.off("challenge_unlocked");
      socket.off("phish_event");
      socket.off("leaderboard_update");
    };
  }, [id, fetchData]);

  useEffect(() => {
    if (session?.status !== "live" || !session?.started_at) return;
    const interval = setInterval(() => {
      const start = new Date(session.started_at!).getTime();
      const now = new Date().getTime();
      const diff = Math.floor((now - start) / 1000);
      const h = Math.floor(diff / 3600);
      const m = Math.floor((diff % 3600) / 60);
      const s = diff % 60;
      setTimeElapsed(`${h > 0 ? h + 'h ' : ''}${m}m ${s}s`);
    }, 1000);
    return () => clearInterval(interval);
  }, [session]);

  const handleStatusChange = async (newStatus: string) => {
    try {
      await api(`/sessions/${id}/status`, {
        method: "PUT",
        body: JSON.stringify({ status: newStatus })
      });
      fetchData();
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  const handleUnlockChallenge = async (challengeId: string) => {
    try {
      await api(`/sessions/${id}/challenges/${challengeId}/unlock`, { method: "POST" });
      // UI updates via socket or direct refresh
      setChallenges(prev => prev.map(c => c.id === challengeId ? { ...c, unlocked_at: new Date().toISOString() } : c));
    } catch (err) {
      console.error("Failed to unlock challenge:", err);
    }
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-brand-700" />
        <p className="font-bold text-slate-400 uppercase tracking-widest text-xs">Synchronizing Tactical Data</p>
      </div>
    </div>
  );

  if (!session) return <div>Session not found</div>;

  const isLive = session.status === "live";

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Bar */}
      <header className="bg-slate-900 text-white px-8 py-4 flex items-center justify-between shadow-2xl z-50">
        <div className="flex items-center gap-6">
          <Link href="/admin/sessions" className="text-slate-400 hover:text-white transition-colors">
            <ChevronLeft className="h-6 w-6" />
          </Link>
          <div className="flex flex-col">
            <h1 className="text-xl font-black tracking-tight">{session.name} <span className="text-slate-500 font-medium text-sm ml-2">@{session.join_code}</span></h1>
            <div className="flex items-center gap-3 mt-0.5">
              <span className={`flex items-center gap-1.5 text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${isLive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>
                {isLive && <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                {session.status}
              </span>
              {isLive && (
                <span className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase">
                  <Clock className="h-3 w-3" /> {timeElapsed}
                </span>
              )}
              <span className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase">
                <Users className="h-3 w-3" /> {participants.length} Active
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            className="border-white/10 text-white hover:bg-white/10 h-10 gap-2"
            onClick={() => {
              navigator.clipboard.writeText(session.join_code);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
          >
            {copied ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Join Code"}
          </Button>
          {session.status !== "ended" && (
            <Button 
              className={`h-10 px-6 font-black ${isLive ? 'bg-red-600 hover:bg-red-700' : 'bg-brand-600 hover:bg-brand-700'}`}
              onClick={() => {
                const nextStatus = isLive ? "ended" : session.status === "draft" ? "ready" : "live";
                if (confirm(`Are you sure you want to set status to ${nextStatus}?`)) {
                  handleStatusChange(nextStatus);
                }
              }}
            >
              {isLive ? <Square className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
              {isLive ? "END SESSION" : session.status === "draft" ? "SET READY" : "GO LIVE"}
            </Button>
          )}
          {session.status === "ended" && (
            <Link href={`/admin/sessions/${id}/report`}>
              <Button className="bg-brand-600 hover:bg-brand-700 h-10 gap-2">
                <FileText className="h-4 w-4" /> Final Report
              </Button>
            </Link>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        {!isLive ? (
          /* SETUP MODE — Two Column */
          <div className="h-full grid grid-cols-1 lg:grid-cols-[1fr,400px] p-8 gap-8 overflow-y-auto">
            {/* Left: Challenge Assignment */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                  <Activity className="h-6 w-6 text-brand-700" /> Mission Pipeline
                </h2>
                <Button className="gap-2 bg-slate-900 hover:bg-slate-800">
                  <Plus className="h-4 w-4" /> Add Mission
                </Button>
              </div>

              <div className="space-y-3">
                {challenges.map((ch, i) => (
                  <Card key={ch.id} className="p-4 flex items-center justify-between border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-4">
                      <div className="cursor-grab text-slate-300 hover:text-slate-600">
                        <GripVertical className="h-5 w-5" />
                      </div>
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-xs font-black text-slate-500">
                        {i + 1}
                      </span>
                      <div>
                        <span className="text-[10px] font-black uppercase text-slate-400 block tracking-widest">{ch.category}</span>
                        <span className="font-bold text-slate-800">{ch.title}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-black text-brand-700 text-sm">{ch.points} PTS</span>
                      <Button variant="ghost" size="sm" className="text-slate-300 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
                {challenges.length === 0 && (
                  <div className="py-20 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-3xl opacity-40">
                    <Activity className="h-10 w-10 mb-2" />
                    <p className="font-bold">No missions assigned yet</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Session Config */}
            <div className="space-y-6">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                <Settings className="h-6 w-6 text-brand-700" /> Strategic Configuration
              </h2>
              <Card className="p-6 space-y-6 border-slate-100 shadow-lg">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Session Intelligence Name</label>
                  <Input defaultValue={session.name} className="font-bold" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Engagement Schedule</label>
                  <Input type="datetime-local" defaultValue={session.scheduled_at?.slice(0, 16)} className="font-bold" />
                </div>
                
                <div className="pt-4 border-t border-slate-100">
                  <h4 className="text-sm font-black uppercase text-slate-900 mb-4">Initial Phishing Operation</h4>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-xs text-slate-500 font-medium leading-relaxed">Select the template to deploy as soon as the session goes live (Pre-session campaign).</p>
                    <select 
                      title="Select Phishing Template"
                      className="mt-3 w-full h-10 px-3 rounded-xl border border-slate-200 bg-white font-bold text-sm outline-none focus:border-brand-600"
                    >
                      <option>-- Select Template --</option>
                      <option>Microsoft 365 Security Alert</option>
                      <option>HR Policy Update</option>
                    </select>
                  </div>
                </div>

                <Button 
                  className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 font-black text-lg"
                  onClick={() => handleStatusChange("live")}
                >
                  <Play className="mr-2 h-5 w-5 fill-current" /> DEPLOY AS LIVE
                </Button>
              </Card>
            </div>
          </div>
        ) : (
          /* LIVE MODE — Three Column */
          <div className="h-full grid grid-cols-1 lg:grid-cols-[340px,1fr,340px] overflow-hidden">
            {/* Left: Participants & Challenges */}
            <div className="border-r border-slate-200 bg-white flex flex-col overflow-hidden">
              <div className="p-6 border-b border-slate-100">
                <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-4 flex items-center gap-2">
                  <Users className="h-3 w-3" /> Field Personnel
                </h3>
                <div className="flex flex-col gap-2 h-48 overflow-y-auto pr-1">
                  {participants.map(p => (
                    <div key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-800">{p.name}</span>
                        <span className="text-[9px] font-black text-brand-600 uppercase">Score: {p.score}</span>
                      </div>
                      <span className="text-[9px] font-bold text-slate-400">
                        {new Date(p.joined_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                  {participants.length === 0 && (
                     <div className="text-center py-10 opacity-30 text-[10px] font-bold uppercase">Waiting for joins...</div>
                  )}
                </div>
              </div>

              <div className="flex-1 p-6 flex flex-col overflow-hidden">
                <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-4 flex items-center gap-2">
                  <ShieldCheck className="h-3 w-3" /> Mission Status
                </h3>
                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                  {challenges.map((ch) => (
                    <div key={ch.id} className={`p-4 rounded-2xl border-2 transition-all ${ch.unlocked_at ? 'border-emerald-100 bg-emerald-50/20' : 'border-slate-50 bg-slate-50/30'}`}>
                      <div className="flex flex-col mb-3">
                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">{ch.category}</span>
                        <span className="font-bold text-sm text-slate-800 leading-tight">{ch.title}</span>
                      </div>
                      <div className="flex items-center justify-between">
                         <span className="text-[9px] font-black text-brand-700 uppercase">{ch.solved_count || 0} / {participants.length} Solved</span>
                         {ch.unlocked_at ? (
                           <span className="text-[9px] font-black text-emerald-600 uppercase flex items-center gap-1">
                             <CheckCircle2 className="h-3 w-3" /> Unlocked
                           </span>
                         ) : (
                           <Button size="sm" className="h-7 px-3 text-[10px] uppercase font-black" onClick={() => handleUnlockChallenge(ch.id)}>
                             Unlock
                           </Button>
                         )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Centre: Live Activity */}
            <div className="bg-slate-50 flex flex-col overflow-hidden p-6 gap-6">
              <div className="grid grid-cols-2 gap-6 h-[400px]">
                <PhishTracker sessionId={id} />
                <PollController sessionId={id} totalParticipants={participants.length} />
              </div>
              
              <div className="flex-1 flex flex-col min-h-0">
                <Card className="flex-1 flex flex-col border-none shadow-xl shadow-brand-700/5 bg-white overflow-hidden">
                  <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                       <Activity className="h-4 w-4" /> Live Activity Feed
                    </h3>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {activity.map((act, i) => (
                      <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors">
                        <div className={`h-2 w-2 rounded-full ${
                          act.type === 'phish' ? 'bg-red-500' : 
                          act.type === 'join' ? 'bg-emerald-500' : 'bg-brand-500'
                        }`} />
                        <span className="text-[11px] font-bold text-slate-400">
                          [{act.time.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}]
                        </span>
                        <span className="text-xs font-medium text-slate-700">
                          {act.type === 'join' ? (
                            <><span className="font-black">{act.name}</span> joined the tactical room</>
                          ) : act.type === 'unlock' ? (
                            <>Mission intelligence unlocked for all units</>
                          ) : (
                            <><span className="font-black text-red-600">{act.participant_name}</span> triggered <span className="font-black uppercase">{act.event_type}</span> event</>
                          )}
                        </span>
                      </div>
                    ))}
                    {activity.length === 0 && <div className="text-center py-20 text-slate-300 text-xs font-bold uppercase italic">Operational quiet. No activity detected.</div>}
                  </div>
                </Card>
              </div>
            </div>

            {/* Right: Leaderboard */}
            <div className="border-l border-slate-200 bg-white overflow-hidden p-6">
              <ScoreBoard sessionId={id} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
