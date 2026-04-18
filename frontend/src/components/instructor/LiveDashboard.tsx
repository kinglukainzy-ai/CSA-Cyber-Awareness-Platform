"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { useSocket } from "@/providers/SocketProvider";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  Play,
  Square,
  Unlock,
  Clock,
  Users,
  Activity,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";

interface Challenge {
  id: string;
  title: string;
  category: string;
  points: number;
  order_num: number;
  unlocked_at?: string | null;
}

export function LiveDashboard({ sessionId }: { sessionId: string }) {
  const [status, setStatus] = useState<string>("ready");
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [participantsCount, setParticipantsCount] = useState(0);
  const [elapsedStr, setElapsedStr] = useState("—");
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [unlocking, setUnlocking] = useState<string | null>(null);
  const [adminId, setAdminId] = useState<string | null>(null);
  const { socket } = useSocket();

  const fetchData = useCallback(async () => {
    try {
      const data = await api<{ session: any; challenges: Challenge[]; participants_count: number }>(
        `/sessions/${sessionId}`
      );
      setStatus(data.session.status);
      setChallenges(data.challenges);
      setParticipantsCount(data.participants_count);
      if (data.session.started_at) {
        setStartedAt(new Date(data.session.started_at));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  // Live elapsed timer
  useEffect(() => {
    if (!startedAt || status !== "live") return;
    const tick = () => {
      const diff = Math.floor((Date.now() - startedAt.getTime()) / 1000);
      const h = Math.floor(diff / 3600);
      const m = Math.floor((diff % 3600) / 60);
      const s = diff % 60;
      setElapsedStr(
        h > 0
          ? `${h}h ${m}m`
          : m > 0
            ? `${m}m ${s}s`
            : `${s}s`
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt, status]);

  useEffect(() => {
    fetchData();

    // Get current admin for metrics/actions
    api<any>("/auth/me").then(me => setAdminId(me.id)).catch(() => { });

    if (socket) {
      socket.on("participant_joined", (payload: { total_participants: number }) => {
        setParticipantsCount(payload.total_participants);
      });
    }

    return () => {
      if (socket) {
        socket.off("participant_joined");
      }
    };
  }, [sessionId, fetchData, socket]);

  const updateStatus = async (newStatus: string) => {
    if (newStatus === "ended") {
      // FAULT 8: Consolidate ending session to socket path only
      if (socket) {
        socket.emit("end_session", { session_id: sessionId, admin_id: adminId });
        setStatus("ended");
      }
      return;
    }

    try {
      await api(`/sessions/${sessionId}/status`, {
        method: "PUT",
        body: JSON.stringify({ status: newStatus }),
      });
      setStatus(newStatus);
      if (newStatus === "live") setStartedAt(new Date());
    } catch (err) {
      console.error(err);
    }
  };

  const unlockChallenge = async (challengeId: string) => {
    setUnlocking(challengeId);
    try {
      // REST call — persists unlocked_at in DB AND emits socket event server-side
      await api(`/sessions/${sessionId}/challenges/${challengeId}/unlock`, {
        method: "PUT",
      });
      setChallenges((prev) =>
        prev.map((c) =>
          c.id === challengeId ? { ...c, unlocked_at: new Date().toISOString() } : c
        )
      );
    } catch (err) {
      console.error(err);
    } finally {
      setUnlocking(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center opacity-30">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Session Controls */}
      <Card className="flex items-center justify-between border-none bg-slate-900 p-8 text-white shadow-xl">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <div
              className={`h-2 w-2 rounded-full ${status === "live" ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                }`}
            />
            <span className="text-[10px] font-black uppercase tracking-widest opacity-60">
              Status: {status}
            </span>
          </div>
          <h2 className="text-3xl font-black tracking-tight">Master Control</h2>
        </div>

        <div className="flex gap-4">
          {status === "draft" && (
            <Button
              onClick={() => updateStatus("ready")}
              className="h-12 bg-blue-600 hover:bg-blue-700 px-8 text-lg"
            >
              Set Ready
            </Button>
          )}
          {status !== "live" && status !== "ended" && (
            <Button
              onClick={() => updateStatus("live")}
              className="h-12 bg-emerald-600 hover:bg-emerald-700 px-8 text-lg"
            >
              <Play className="mr-2 h-5 w-5" /> Start Session
            </Button>
          )}
          {status === "live" && (
            <Button
              onClick={() => updateStatus("ended")}
              variant="outline"
              className="h-12 border-red-500/50 text-red-500 hover:bg-red-50 px-8 text-lg"
            >
              <Square className="mr-2 h-5 w-5" /> End Session
            </Button>
          )}
        </div>
      </Card>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card className="flex items-center gap-4 p-5 border-none shadow-xl shadow-slate-200/50">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-700/10 text-brand-700">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Joined</p>
            <p className="text-xl font-black text-slate-900">{participantsCount}</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4 p-5 border-none shadow-xl shadow-slate-200/50">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-700/10 text-emerald-700">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Missions Unlocked</p>
            <p className="text-xl font-black text-slate-900">
              {challenges.filter((c) => c.unlocked_at).length} / {challenges.length}
            </p>
          </div>
        </Card>

        <Card className="flex items-center gap-4 p-5 border-none shadow-xl shadow-slate-200/50">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-700/10 text-amber-700">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Time Elapsed</p>
            <p className="text-xl font-black text-slate-900">{elapsedStr}</p>
          </div>
        </Card>
      </div>

      {/* Challenge Pipeline */}
      <div className="flex flex-col gap-4">
        <h3 className="text-xl font-bold text-slate-900">Mission Pipeline</h3>
        <div className="flex flex-col gap-3">
          {challenges.map((challenge, index) => (
            <div
              key={challenge.id}
              className={`group flex items-center justify-between rounded-2xl border-2 p-4 transition-all ${challenge.unlocked_at
                  ? "border-emerald-100 bg-emerald-50/20"
                  : "border-slate-100 bg-white"
                }`}
            >
              <div className="flex items-center gap-4">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-500">
                  {index + 1}
                </span>
                <div className="flex flex-col">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    {challenge.category}
                  </p>
                  <p className="font-bold text-slate-900">{challenge.title}</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Points</p>
                  <p className="text-sm font-black text-brand-700">{challenge.points}</p>
                </div>

                {challenge.unlocked_at ? (
                  <div className="flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-black uppercase text-emerald-700">
                    <CheckCircle2 className="h-3 w-3" /> Active
                  </div>
                ) : (
                  <Button
                    size="sm"
                    className="h-9 gap-2"
                    disabled={unlocking === challenge.id || status !== "live"}
                    onClick={() => unlockChallenge(challenge.id)}
                  >
                    {unlocking === challenge.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Unlock className="h-3.5 w-3.5" />
                    )}
                    Unlock
                  </Button>
                )}
              </div>
            </div>
          ))}

          {challenges.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-slate-200 rounded-3xl opacity-40">
              <AlertCircle className="h-10 w-10 mb-2" />
              <p className="font-bold">No missions assigned to this session</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
