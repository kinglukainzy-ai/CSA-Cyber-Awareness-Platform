"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Plus,
  Monitor,
  Loader2,
  Calendar,
  ChevronRight,
  FileText,
  Users,
  Copy,
  X,
  Filter,
  CheckCircle2,
} from "lucide-react";
import { Session, Organisation } from "@/types";

const STATUS_STYLES: Record<string, string> = {
  draft:  "bg-slate-100 text-slate-600",
  ready:  "bg-blue-100 text-blue-700",
  live:   "bg-emerald-100 text-emerald-700",
  ended:  "bg-slate-100 text-slate-500",
};

const STATUS_DOT: Record<string, string> = {
  draft:  "bg-slate-400",
  ready:  "bg-blue-500",
  live:   "bg-emerald-500 animate-pulse",
  ended:  "bg-slate-300",
};

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [orgs, setOrgs] = useState<Organisation[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [orgFilter, setOrgFilter] = useState("all");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "", org_id: "", scheduled_at: "" });

  const fetchData = async () => {
    try {
      const [sData, oData] = await Promise.all([
        api<Session[]>("/sessions"),
        api<Organisation[]>("/organisations")
      ]);
      setSessions(sData);
      setOrgs(oData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredSessions = useMemo(() => {
    return sessions.filter(s => {
      const matchStatus = statusFilter === "all" || s.status === statusFilter;
      const matchOrg = orgFilter === "all" || s.org_id === orgFilter;
      return matchStatus && matchOrg;
    });
  }, [sessions, statusFilter, orgFilter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api("/sessions", {
        method: "POST",
        body: JSON.stringify({
          ...formData,
          scheduled_at: formData.scheduled_at ? new Date(formData.scheduled_at).toISOString() : null
        })
      });
      fetchData();
      setDrawerOpen(false);
      setFormData({ name: "", org_id: "", scheduled_at: "" });
    } catch (err) {
      console.error(err);
    }
  };

  const copyJoinCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(code);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex flex-col gap-8 relative overflow-hidden">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-4xl font-black tracking-tight text-slate-900">Engagements</h1>
          <p className="text-sm font-medium text-slate-500">Scheduled and active cyber awareness sessions.</p>
        </div>
        <Button onClick={() => setDrawerOpen(true)} className="h-11 px-6">
          <Plus className="h-4 w-4 mr-2" /> New Session
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 rounded-xl bg-white border border-slate-200 p-1.5 shadow-sm">
          {["all", "draft", "ready", "live", "ended"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-4 py-1.5 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${
                statusFilter === s ? "bg-brand-700 text-white shadow-md shadow-brand-700/20" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="relative pb-0 mb-0">
          <select 
            className="flex h-10 w-48 rounded-xl border border-slate-200 bg-white px-8 py-2 text-xs font-black uppercase tracking-widest text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700/50 appearance-none"
            value={orgFilter}
            onChange={e => setOrgFilter(e.target.value)}
            title="Filter by Organisation"
          >
            <option value="all">All Orgs</option>
            {orgs.map(org => (
              <option key={org.id} value={org.id}>{org.name}</option>
            ))}
          </select>
          <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
        </div>
      </div>

      <Card className="overflow-hidden border-none p-0 shadow-xl shadow-slate-200/50">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">SESSION</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">ORGANISATION</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">JOIN CODE</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">STATUS</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">DATE</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">PARTICIPANTS</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white text-sm">
              {filteredSessions.map((session) => (
                <tr key={session.id} className="group hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-5 font-bold text-slate-900">{session.name}</td>
                  <td className="px-6 py-5 text-slate-600 font-medium">
                    {orgs.find(o => o.id === session.org_id)?.name || "Unassigned"}
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-brand-700 bg-brand-700/5 px-2 py-1 rounded-lg text-xs">
                        {session.join_code}
                      </span>
                      <button 
                        title="Copy Join Code"
                        onClick={() => copyJoinCode(session.join_code)} 
                        className={`transition-colors ${copiedId === session.join_code ? "text-emerald-500" : "text-slate-300 hover:text-brand-700"}`}
                      >
                        {copiedId === session.join_code ? <CheckCircle2 className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-tight ${STATUS_STYLES[session.status]}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[session.status]}`} />
                      {session.status}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-slate-500 font-medium">
                    {session.scheduled_at ? new Date(session.scheduled_at).toLocaleDateString() : "N/A"}
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2 font-bold text-slate-900">
                      <Users className="h-3.5 w-3.5 text-slate-400" />
                      {session.participants_count || 0}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2">
                      {session.status === "ended" ? (
                        <Link href={`/admin/sessions/${session.id}/report`}>
                          <Button variant="ghost" size="sm" className="h-9 gap-2 text-slate-500">
                            <FileText className="h-4 w-4" /> Report
                          </Button>
                        </Link>
                      ) : (
                        <Link href={`/admin/sessions/${session.id}/control`}>
                          <Button size="sm" className="h-9 gap-2">
                            <Monitor className="h-4 w-4" /> Open
                          </Button>
                        </Link>
                      )}
                      <Link href={`/admin/sessions/${session.id}`}>
                        <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
              {loading && (
                  <tr>
                      <td colSpan={7} className="py-20 text-center text-slate-300">
                          <Loader2 className="h-8 w-8 mx-auto animate-spin" />
                      </td>
                  </tr>
              )}
              {filteredSessions.length === 0 && !loading && (
                  <tr>
                      <td colSpan={7} className="py-20">
                          <div className="mx-auto max-w-sm flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-200 rounded-3xl opacity-40">
                              <Calendar className="h-10 w-10 mb-2" />
                              <p className="font-bold">No engagements found</p>
                          </div>
                      </td>
                  </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* New Session Drawer */}
      {drawerOpen && (
        <>
          <div className="fixed inset-0 z-[60] bg-slate-900/20 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
          <div className="fixed inset-y-0 right-0 z-[70] w-full max-w-md border-l border-slate-200 bg-white p-8 shadow-2xl animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between border-b border-slate-100 pb-6 mb-8">
              <div>
                <h3 className="text-xl font-black text-slate-900">Provision Engagement</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Session Parameters</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setDrawerOpen(false)} className="h-10 w-10 p-0 rounded-xl">
                 <X className="h-5 w-5" />
              </Button>
            </div>

            <form onSubmit={handleCreate} className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Session Name</label>
                <Input 
                  required 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g. Q4 Executive Training" 
                />
              </div>
              
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Organisation</label>
                <select 
                  className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700/50"
                  value={formData.org_id}
                  onChange={e => setFormData({...formData, org_id: e.target.value})}
                  required
                  title="Target Organisation"
                >
                  <option value="">Select organisation...</option>
                  {orgs.map(org => (
                    <option key={org.id} value={org.id}>{org.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Scheduled Date</label>
                <Input 
                  type="datetime-local"
                  value={formData.scheduled_at} 
                  onChange={e => setFormData({...formData, scheduled_at: e.target.value})}
                />
              </div>

              <div className="mt-8 flex gap-3">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setDrawerOpen(false)}>Cancel</Button>
                <Button type="submit" className="flex-1">Create Engagement</Button>
              </div>
              
              <div className="p-4 rounded-xl bg-brand-700/5 border border-brand-700/10 mt-4">
                 <p className="text-[10px] font-bold text-brand-700 uppercase tracking-widest mb-1">Auto-Generation</p>
                 <p className="text-[10px] text-brand-700/70 font-medium leading-relaxed">
                   A unique <strong className="font-bold text-brand-800">CSA-XXXX</strong> join code will be generated upon creation. This code remains active until the session is ended.
                 </p>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
