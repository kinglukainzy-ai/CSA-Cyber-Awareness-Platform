"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useSocket } from "@/providers/SocketProvider";
import { useParticipantStore } from "@/lib/participant-store";
import { Logo } from "@/components/shared/Logo";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Leaderboard } from "@/components/participant/Leaderboard";
import { ChallengeCard } from "@/components/participant/ChallengeCard";
import { FlagSubmit } from "@/components/participant/FlagSubmit";
import { HintDrawer } from "@/components/participant/HintDrawer";
import { PollWidget } from "@/components/participant/PollWidget";
import { BreachWidget } from "@/components/participant/BreachWidget";
import { SessionEndScreen } from "@/components/participant/SessionEndScreen";
import { ScenarioChallenge } from "@/components/participant/ScenarioChallenge";
import { DecisionChallenge } from "@/components/participant/DecisionChallenge";
import {
  ShieldCheck,
  Users,
  Terminal,
  LogOut,
  AlertCircle,
  Clock,
} from "lucide-react";
import type { Challenge, LeaderboardEntry } from "@/types";

export default function SessionPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const participant = useParticipantStore();

  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [activeChallenge, setActiveChallenge] = useState<Challenge | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [sessionStatus, setSessionStatus] = useState<string>("ready");
  const [loading, setLoading] = useState(true);
  const { socket, connect, disconnect } = useSocket();

  const fetchData = async () => {
    if (!participant.sessionId) return;
    try {
      const data = await api<{ session: any; challenges: Challenge[]; participants_count: number }>(
        `/sessions/${participant.sessionId}`,
        { headers: { "X-Participant-UUID": participant.participantUuid! } }
      );
      setChallenges(data.challenges);
      setSessionStatus(data.session.status);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!participant.participantUuid) {
      router.push(`/join?code=${params.code}`);
      return;
    }

    fetchData();

    if (socket) {
      connect();
      socket.emit("join_session", {
        session_id: participant.sessionId,
        session_code: participant.sessionCode,
      });

      socket.on("session_status", (payload: { status: string }) => {
        setSessionStatus(payload.status);
      });

      socket.on("challenge_unlocked", (payload: { challenge_id: string }) => {
        setChallenges(prev =>
          prev.map(c => c.id === payload.challenge_id ? { ...c, is_locked: false } : c)
        );
      });

      socket.on("leaderboard_update", (payload: { leaderboard: LeaderboardEntry[] }) => {
        setLeaderboard(payload.leaderboard);
      });
    }

    return () => {
      if (socket) {
        socket.off("session_status");
        socket.off("challenge_unlocked");
        socket.off("leaderboard_update");
        disconnect();
      }
    };
  }, [participant.sessionId, socket, connect, disconnect]);

  const handleLogout = () => {
    participant.clear();
    router.push("/");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <Logo />
          <div className="h-2 w-48 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full w-1/2 animate-progress bg-brand-700"></div>
          </div>
          <p className="text-sm font-bold text-slate-400">CONNECTING TO GATEWAY...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Logo />
          <div className="flex items-center gap-6">
            <div className="hidden items-center gap-2 rounded-full bg-slate-100 px-4 py-1.5 text-sm font-bold text-slate-600 lg:flex">
              <Users className="h-4 w-4 text-brand-700" />
              {participant.name}
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-red-600 hover:bg-red-50 hover:text-red-700">
              <LogOut className="h-4 w-4 mr-2" /> Leave
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="grid gap-10 lg:grid-cols-[1fr,380px]">
          <div className="flex flex-col gap-8">
            {/* Session Hero */}
            <Card className="border-none bg-gradient-to-br from-brand-700 to-brand-800 p-8 text-white shadow-xl shadow-brand-700/20">
              <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2 text-brand-200">
                    <Clock className="h-4 w-4" />
                    <span className="text-xs font-black uppercase tracking-widest">LIVE ENGAGEMENT</span>
                  </div>
                  <h1 className="text-4xl font-black tracking-tight">{params.code}</h1>
                  <p className="mt-1 text-brand-100 font-medium opacity-80">
                    Organisation: {participant.sessionId ? "Ghana CSA" : "Trial"}
                  </p>
                </div>
                <div className="flex items-center gap-4 rounded-2xl bg-white/10 p-4 backdrop-blur-md">
                  <div className="text-right">
                    <p className="text-[10px] font-black uppercase tracking-widest text-brand-200">Session Status</p>
                    <p className="text-xl font-black uppercase text-secondary">{sessionStatus}</p>
                  </div>
                  <div className="h-10 w-px bg-white/20" />
                  <div className="h-12 w-12 rounded-xl bg-white/20 grid place-items-center">
                    <ShieldCheck className="h-6 w-6 text-white" />
                  </div>
                </div>
              </div>
            </Card>

            {/* Challenges List */}
            <div className="flex flex-col gap-4">
              <h2 className="text-2xl font-black text-slate-900">Mission Pipeline</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {challenges.map((challenge) => (
                  <ChallengeCard
                    key={challenge.id}
                    title={challenge.title}
                    category={challenge.category}
                    points={challenge.points}
                    locked={challenge.is_locked}
                    active={activeChallenge?.id === challenge.id}
                    onClick={() => setActiveChallenge(challenge)}
                  />
                ))}
              </div>
            </div>

            {/* Active Challenge View */}
            {activeChallenge && (
              <Card className="flex flex-col gap-8 border-2 border-brand-700/10 p-10 animate-in fade-in slide-in-from-top-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-black uppercase tracking-widest text-brand-700">ACTIVE MISSION</span>
                    <h2 className="mt-1 text-3xl font-black text-slate-900">{activeChallenge.title}</h2>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setActiveChallenge(null)}>Close</Button>
                </div>

                <div className="prose prose-slate max-w-none">
                  {activeChallenge.type === "ctf" ? (
                    <div className="flex flex-col gap-6">
                      <div className="rounded-xl bg-slate-900 p-6 text-emerald-400 font-mono text-sm">
                        <div className="flex items-center gap-2 border-b border-white/10 pb-4 mb-4 text-white">
                          <Terminal className="h-4 w-4" />
                          MISSION INTELLIGENCE
                        </div>
                        <p>{activeChallenge.content?.scenario || "No intelligence provided."}</p>
                      </div>
                      <div className="flex flex-col gap-4 border-t border-slate-100 pt-6">
                        <label className="text-sm font-bold text-slate-700">SUBMIT RECOVERED FLAG</label>
                        <FlagSubmit
                          challengeId={activeChallenge.id}
                          sessionId={participant.sessionId!}
                          participantUuid={participant.participantUuid!}
                        />
                      </div>
                    </div>
                  ) : activeChallenge.type === "scenario" ? (
                    <ScenarioChallenge challenge={activeChallenge} />
                  ) : activeChallenge.type === "decision" ? (
                    <DecisionChallenge challenge={activeChallenge} />
                  ) : (
                    <div className="p-10 text-center border-2 border-dashed border-slate-200 rounded-3xl">
                      <AlertCircle className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                      <p className="font-bold text-slate-900">Challenge type not supported yet.</p>
                    </div>
                  )}
                </div>

                <div className="border-t border-slate-100 pt-8">
                  <HintDrawer
                    challengeId={activeChallenge.id}
                    sessionId={participant.sessionId!}
                    participantUuid={participant.participantUuid!}
                  />
                </div>
              </Card>
            )}

            <BreachWidget
              sessionId={participant.sessionId!}
              participantUuid={participant.participantUuid!}
            />
          </div>

          <aside className="flex flex-col gap-8">
            <Leaderboard entries={leaderboard} />
            <Card className="flex flex-col gap-4 border-none bg-white p-6 shadow-xl shadow-brand-700/5">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-brand-700" />
                <h4 className="font-bold text-slate-900">Safety Notice</h4>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                This is a controlled environment. All phishing drills and challenges are simulations.
                Do not enter real work credentials unless explicitly asked in a safe lab environment.
              </p>
            </Card>
          </aside>
        </div>
      </main>

      <PollWidget
        sessionId={participant.sessionId!}
        participantUuid={participant.participantUuid!}
      />

      {sessionStatus === "ended" && (
        <SessionEndScreen
          participantUuid={participant.participantUuid!}
          sessionId={participant.sessionId!}
        />
      )}
    </div>
  );
}