"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  Building2,
  Monitor,
  Terminal,
  Users,
  Activity,
  ArrowRight,
  Plus,
  Loader2,
  ShieldCheck,
  BarChart3,
  ChevronRight,
  Calendar,
} from "lucide-react";

interface DashboardStats {
  total_organisations: number;
  total_sessions: number;
  live_sessions: number;
  total_challenges: number;
}

interface Session {
  id: string;
  name: string;
  status: string;
  join_code: string;
  created_at: string;
}

interface Organisation {
  id: string;
  name: string;
  sector?: string;
  created_at: string;
}

export default function AdminDashboard() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [orgs, setOrgs] = useState<Organisation[]>([]);
  const [challenges, setChallenges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api<Session[]>("/sessions"),
      api<Organisation[]>("/organisations"),
      api<any[]>("/challenges"),
    ])
      .then(([s, o, c]) => {
        setSessions(s);
        setOrgs(o);
        setChallenges(c);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const stats: DashboardStats = {
    total_organisations: orgs.length,
    total_sessions: sessions.length,
    live_sessions: sessions.filter((s) => s.status === "live").length,
    total_challenges: challenges.length,
  };

  const recentSessions = sessions.slice(0, 5);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-700 opacity-40" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-brand-700">Operation Centre</p>
          <h1 className="text-4xl font-black tracking-tight text-slate-900">Platform Overview</h1>
          <p className="text-sm font-medium text-slate-500">
            {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/admin/organisations">
            <Button variant="outline" className="gap-2 border-slate-200">
              <Building2 className="h-4 w-4" /> New Org
            </Button>
          </Link>
          <Link href="/admin/sessions/new">
            <Button className="gap-2 px-6">
              <Plus className="h-4 w-4" /> New Session
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
        {[
          {
            icon: <Building2 className="h-6 w-6" />,
            label: "Organisations",
            value: stats.total_organisations,
            href: "/admin/organisations",
            color: "text-blue-700 bg-blue-700/10",
          },
          {
            icon: <Monitor className="h-6 w-6" />,
            label: "Total Sessions",
            value: stats.total_sessions,
            href: "/admin/sessions",
            color: "text-brand-700 bg-brand-700/10",
          },
          {
            icon: <Activity className="h-6 w-6" />,
            label: "Live Right Now",
            value: stats.live_sessions,
            href: "/admin/sessions",
            color: "text-emerald-700 bg-emerald-700/10",
            highlight: stats.live_sessions > 0,
          },
          {
            icon: <Terminal className="h-6 w-6" />,
            label: "Mission Library",
            value: stats.total_challenges,
            href: "/admin/challenges",
            color: "text-amber-700 bg-amber-700/10",
          },
        ].map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <Card
              className={`group flex flex-col gap-4 border-none p-6 shadow-xl shadow-slate-200/50 transition-all hover:-translate-y-1 hover:shadow-brand-700/10 ${
                stat.highlight ? "ring-2 ring-emerald-500/30" : ""
              }`}
            >
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${stat.color}`}>
                {stat.icon}
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{stat.label}</p>
                <p className="mt-1 text-4xl font-black text-slate-900">{stat.value}</p>
              </div>
              {stat.highlight && (
                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Active Now
                </div>
              )}
            </Card>
          </Link>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid gap-10 lg:grid-cols-[1fr,380px]">
        {/* Recent sessions */}
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">Recent Sessions</h2>
            <Link href="/admin/sessions">
              <Button variant="ghost" size="sm" className="gap-1 text-brand-700">
                View All <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          <Card className="overflow-hidden border-none p-0 shadow-xl shadow-slate-200/50">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">SESSION</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">CODE</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">STATUS</th>
                    <th className="px-6 py-4" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white text-sm">
                  {recentSessions.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-16 text-center opacity-30 font-bold">
                        No sessions yet. Create your first engagement.
                      </td>
                    </tr>
                  )}
                  {recentSessions.map((session) => (
                    <tr key={session.id} className="group hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-900">{session.name}</td>
                      <td className="px-6 py-4">
                        <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-xs font-black text-slate-700">
                          {session.join_code}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-tight ${
                            session.status === "live"   ? "bg-emerald-100 text-emerald-700" :
                            session.status === "ready"  ? "bg-blue-100 text-blue-700" :
                            session.status === "ended"  ? "bg-amber-100 text-amber-700" :
                                                          "bg-slate-100 text-slate-600"
                          }`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${session.status === "live" ? "bg-emerald-500 animate-pulse" : "bg-current opacity-40"}`} />
                          {session.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link href={`/admin/sessions/${session.id}`}>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100">
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Quick action panel */}
        <div className="flex flex-col gap-6">
          <h2 className="text-xl font-bold text-slate-900">Quick Actions</h2>

          <div className="flex flex-col gap-4">
            <Link href="/admin/sessions/new">
              <Card className="group flex cursor-pointer items-center justify-between border-none bg-brand-700 p-6 text-white shadow-xl shadow-brand-700/20 transition-all hover:shadow-2xl">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                    <Plus className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-black">New Engagement</p>
                    <p className="text-xs opacity-70 font-medium">Provision a session</p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 opacity-60 group-hover:translate-x-1 transition-transform" />
              </Card>
            </Link>

            <Link href="/admin/organisations">
              <Card className="group flex cursor-pointer items-center justify-between border-none p-6 shadow-xl shadow-slate-200/50 transition-all hover:shadow-brand-700/5">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-black text-slate-900">Add Organisation</p>
                    <p className="text-xs font-medium text-slate-500">Register a new partner</p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-slate-300 group-hover:translate-x-1 transition-transform" />
              </Card>
            </Link>

            <Link href="/admin/challenges">
              <Card className="group flex cursor-pointer items-center justify-between border-none p-6 shadow-xl shadow-slate-200/50 transition-all hover:shadow-brand-700/5">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                    <Terminal className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-black text-slate-900">Mission Library</p>
                    <p className="text-xs font-medium text-slate-500">{stats.total_challenges} missions available</p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-slate-300 group-hover:translate-x-1 transition-transform" />
              </Card>
            </Link>

            <Link href="/admin/phishing">
              <Card className="group flex cursor-pointer items-center justify-between border-none p-6 shadow-xl shadow-slate-200/50 transition-all hover:shadow-brand-700/5">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-700">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-black text-slate-900">Phish Templates</p>
                    <p className="text-xs font-medium text-slate-500">Manage simulation library</p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-slate-300 group-hover:translate-x-1 transition-transform" />
              </Card>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
