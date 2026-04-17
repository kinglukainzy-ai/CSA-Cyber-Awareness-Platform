"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { 
  BookOpen, 
  ChevronRight, 
  Lightbulb, 
  Code, 
  Eye, 
  ShieldAlert 
} from "lucide-react";

interface Tactic {
  id: string;
  title: string;
  description: string;
  points: string[];
  lesson: string;
  icon: string;
  code_snippet?: string;
}

export function PhishEducation({ sessionId }: { sessionId: string }) {
  const [tactics, setTactics] = useState<Tactic[]>([]);
  const [activeTactic, setActiveTactic] = useState<Tactic | null>(null);
  const [loading, setLoading] = useState(true);
  const [broadcasting, setBroadcasting] = useState(false);

  const handleBroadcast = async () => {
    setBroadcasting(true);
    try {
      await api(`/sessions/${sessionId}/phishing/reveal`, { method: "POST" });
    } catch (err) {
      console.error("Broadcast failed", err);
    } finally {
      setBroadcasting(false);
    }
  };

  useEffect(() => {
    const fetchTactics = async () => {
      try {
        const data = await api<Tactic[]>("/phishing/education/tactics");
        setTactics(data);
        setActiveTactic(data[0]);
      } catch (err) {
        console.error("Failed to fetch tactics", err);
      } finally {
        setLoading(false);
      }
    };
    fetchTactics();
  }, []);

  if (loading) return <div className="p-8 text-center text-xs animate-pulse font-mono">LOADING INTEL...</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-1">
      {/* Tactics List */}
      <div className="flex flex-col gap-3 h-[600px] overflow-y-auto pr-2 custom-scrollbar">
        <div className="flex items-center gap-2 mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
          <BookOpen className="h-3 w-3" /> Attack Library
        </div>
        {tactics.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTactic(t)}
            className={`flex flex-col gap-1 p-4 rounded-xl text-left transition-all border ${
              activeTactic?.id === t.id 
                ? "bg-brand-50 border-brand-200 shadow-sm" 
                : "bg-white border-slate-100 hover:border-slate-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black text-brand-500 uppercase tracking-tighter">
                {t.id.replace("_", " ")}
              </span>
              {activeTactic?.id === t.id && <div className="h-1.5 w-1.5 rounded-full bg-brand-500" />}
            </div>
            <h4 className="text-sm font-bold text-slate-900">{t.title}</h4>
            <p className="text-[11px] text-slate-500 line-clamp-1">{t.description}</p>
          </button>
        ))}
      </div>

      {/* Tactic Detail Panel */}
      <Card className="flex flex-col p-6 bg-slate-950 text-slate-300 border-none shadow-2xl relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute -top-24 -right-24 w-64 height-64 bg-brand-500/10 blur-[100px] pointer-events-none" />
        
        {activeTactic ? (
          <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-right-2 duration-300">
            <header className="flex items-center gap-4">
              <div className="text-4xl">{activeTactic.icon}</div>
              <div>
                <h3 className="text-xl font-bold text-white leading-tight">{activeTactic.title}</h3>
                <Badge variant="outline" className="mt-1 border-brand-500/30 text-brand-400 text-[10px] font-mono">
                  ACTIVE DEBRIEF
                </Badge>
              </div>
            </header>

            <p className="text-sm text-slate-400 leading-relaxed italic">
              "{activeTactic.description}"
            </p>

            <div className="flex flex-col gap-2">
              <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Key Indicators</h5>
              <ul className="grid gap-2">
                {activeTactic.points.map((p, i) => (
                  <li key={i} className="flex items-start gap-3 bg-white/5 p-3 rounded-lg border border-white/5 transition-colors hover:bg-white/10">
                    <ChevronRight className="h-3 w-3 mt-1 text-brand-500 flex-shrink-0" />
                    <span className="text-[13px] text-slate-300">{p}</span>
                  </li>
                ))}
              </ul>
            </div>

            {activeTactic.code_snippet && (
              <div className="flex flex-col gap-2">
                 <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                   <Code className="h-3 w-3" /> Underlying Payload
                 </h5>
                 <pre className="p-4 bg-black/50 rounded-xl border border-white/5 font-mono text-[11px] text-brand-400 overflow-x-auto">
                   {activeTactic.code_snippet}
                 </pre>
              </div>
            )}

            <div className="mt-auto bg-brand-500/10 border border-brand-500/20 p-4 rounded-xl flex gap-4 items-start">
               <Lightbulb className="h-5 w-5 text-brand-500 flex-shrink-0 mt-0.5" />
               <div className="flex flex-col gap-1">
                 <span className="text-[10px] font-black uppercase text-brand-500">Workshop Lesson</span>
                 <p className="text-[13px] text-brand-100 font-medium leading-relaxed">
                   {activeTactic.lesson}
                 </p>
               </div>
            </div>

            <Button 
              className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold gap-2"
              onClick={handleBroadcast}
              disabled={broadcasting}
            >
              <ShieldAlert className="h-4 w-4" /> 
              {broadcasting ? "Broadcasting..." : "Broadcast Red Flags to Class"}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-500 opacity-50">
             <Eye className="h-12 w-12" />
             <p className="font-mono text-xs uppercase tracking-widest">Select tactic to debrief</p>
          </div>
        )}
      </Card>
    </div>
  );
}
