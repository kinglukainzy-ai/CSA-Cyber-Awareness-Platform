"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { 
  FileText, 
  Download, 
  RefreshCw, 
  Loader2, 
  Users, 
  ShieldCheck, 
  MousePointer2, 
  AlertTriangle,
  FileWarning,
  CheckCircle2,
  Clock,
  ArrowLeft
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import Link from "next/link";

interface Report {
  id: string;
  status: 'generating' | 'ready' | 'failed';
  storage_path: string | null;
  summary_snapshot: {
    total_participants: number;
    awareness_score: number;
    phishing_click_rate: number | null;
    breach_exposure_rate: number | null;
  } | null;
  generated_at: string;
}

interface Session {
  id: string;
  name: string;
  status: string;
  join_code: string;
}

export default function ReportViewerPage() {
  const params = useParams<{ id: string }>();
  const [session, setSession] = useState<Session | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const fetchSession = useCallback(async () => {
    try {
      const data = await api<{ session: Session }>(`/sessions/${params.id}`);
      setSession(data.session);
    } catch (err) {
      console.error(err);
    }
  }, [params.id]);

  const fetchReport = useCallback(async () => {
    try {
      const data = await api<Report>(`/sessions/${params.id}/report`);
      setReport(data);
      if (data.status === 'generating') {
        setGenerating(true);
      } else {
        setGenerating(false);
      }
    } catch (err: any) {
      if (err.status === 404) {
        setReport(null);
      }
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchSession();
    fetchReport();
  }, [fetchSession, fetchReport]);

  // Polling logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (generating) {
      interval = setInterval(() => {
        fetchReport();
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [generating, fetchReport]);

  const handleGenerate = async () => {
    try {
      await api(`/sessions/${params.id}/report/generate`, { method: "POST" });
      setGenerating(true);
      fetchReport();
    } catch (err) {
      alert("Failed to trigger report generation");
    }
  };

  const handleDownload = () => {
    if (report?.storage_path) {
      window.open(report.storage_path, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-10 w-10 animate-spin text-brand-700 mb-4" />
        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Accessing Intelligence Archives...</p>
      </div>
    );
  }

  const isReady = report?.status === 'ready';
  const isFailed = report?.status === 'failed';
  const canGenerate = session?.status === 'ended';

  return (
    <div className="flex flex-col gap-8 max-w-5xl mx-auto pb-20">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
           <Link href={`/admin/sessions/${params.id}`}>
              <Button variant="ghost" size="sm" className="h-10 w-10 p-0 rounded-full">
                <ArrowLeft className="h-5 w-5" />
              </Button>
           </Link>
           <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Executive Report</h1>
              <p className="text-slate-500 font-medium">Session: <span className="text-slate-900 font-bold">{session?.name} ({session?.join_code})</span></p>
           </div>
        </div>
      </header>

      <AnimatePresence mode="wait">
        {!report && !generating ? (
          <motion.div key="no-report" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
             <Card className="flex flex-col items-center text-center p-16 border-dashed border-2 border-slate-200 bg-white">
                <div className="h-20 w-20 bg-slate-50 rounded-3xl grid place-items-center mb-6">
                   <FileWarning className="h-10 w-10 text-slate-300" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 mb-2">No report generated yet</h2>
                <p className="text-slate-500 mb-8 max-w-sm">Detailed analytics are compiled once the session has officially concluded.</p>
                
                <div className="flex flex-col items-center gap-3">
                   <Button 
                     onClick={handleGenerate} 
                     disabled={!canGenerate}
                     className="h-12 px-10 rounded-xl shadow-lg shadow-brand-700/20"
                   >
                     Generate Report <RefreshCw className="ml-2 h-4 w-4" />
                   </Button>
                   {!canGenerate && (
                     <div className="flex items-center gap-2 text-[10px] font-bold text-orange-600 uppercase tracking-widest">
                        <AlertTriangle className="h-3 w-3" />
                        End the session before generating a report
                     </div>
                   )}
                </div>
             </Card>
          </motion.div>
        ) : generating ? (
          <motion.div key="generating" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
             <Card className="flex flex-col items-center text-center p-20 bg-white border-brand-100 shadow-xl overflow-hidden relative">
                <motion.div 
                  className="absolute bottom-0 left-0 h-1 bg-brand-700"
                  animate={{ width: ["0%", "100%"] }}
                  transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                />
                <div className="h-24 w-24 relative mb-8">
                   <div className="absolute inset-0 rounded-full border-4 border-slate-100" />
                   <div className="absolute inset-0 rounded-full border-4 border-brand-700 border-t-transparent animate-spin" />
                   <div className="absolute inset-0 grid place-items-center">
                      <Clock className="h-8 w-8 text-brand-700" />
                   </div>
                </div>
                <h2 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">Compiling Intelligence...</h2>
                <p className="text-slate-500 font-medium mb-1">We are calculating telemetry and formatting findings.</p>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mt-4">This usually takes 15–30 seconds</p>
             </Card>
          </motion.div>
        ) : isFailed ? (
          <motion.div key="failed" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <Card className="flex flex-col items-center text-center p-16 border-red-100 bg-red-50/30">
               <div className="h-20 w-20 bg-red-100 rounded-full grid place-items-center mb-6">
                  <AlertTriangle className="h-10 w-10 text-red-600" />
               </div>
               <h2 className="text-2xl font-black text-slate-900 mb-2">Generation Failed</h2>
               <p className="text-slate-500 mb-8 max-w-sm">An error occurred while compiling the final PDF. Our engineering team has been notified.</p>
               <Button onClick={handleGenerate} className="bg-red-600 hover:bg-red-700 shadow-lg shadow-red-600/20 h-12 px-10 rounded-xl">
                  Retry Generation <RefreshCw className="ml-2 h-4 w-4" />
               </Button>
            </Card>
          </motion.div>
        ) : isReady ? (
          <motion.div key="ready" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
             {/* Main Action */}
             <Card className="p-10 bg-gradient-to-br from-brand-700 to-brand-900 text-white border-none shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                   <ShieldCheck className="h-64 w-64 rotate-12" />
                </div>
                <div className="relative z-10 flex items-center gap-6">
                   <div className="h-20 w-20 bg-white/20 rounded-3xl backdrop-blur-md grid place-items-center">
                      <FileText className="h-10 w-10 text-white" />
                   </div>
                   <div>
                      <h2 className="text-3xl font-black tracking-tight mb-1">Report Ready</h2>
                      <p className="text-brand-100 font-medium text-sm opacity-80">Compiled on {new Date(report.generated_at).toLocaleString()}</p>
                   </div>
                </div>
                <Button 
                  size="lg" 
                  onClick={handleDownload}
                  className="bg-white text-brand-900 hover:bg-brand-50 h-14 px-12 rounded-2xl font-black text-lg relative z-10 border-none shadow-xl"
                >
                  <Download className="mr-2 h-6 w-6" /> Download PDF Report
                </Button>
             </Card>

             {/* Stat Cards */}
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                  label="Total Participants" 
                  value={report.summary_snapshot?.total_participants || 0} 
                  icon={<Users className="h-5 w-5" />}
                  color="blue"
                />
                <StatCard 
                  label="Awareness Score" 
                  value={`${Math.round(report.summary_snapshot?.awareness_score || 0)}%`}
                  icon={<ShieldCheck className="h-5 w-5" />}
                  color="emerald"
                />
                <StatCard 
                  label="Phishing Click Rate" 
                  value={report.summary_snapshot?.phishing_click_rate !== null ? `${Math.round(report.summary_snapshot!.phishing_click_rate * 100)}%` : "No Campaign"}
                  icon={<MousePointer2 className="h-5 w-5" />}
                  color="orange"
                />
                <StatCard 
                  label="Breach Exposure" 
                  value={report.summary_snapshot?.breach_exposure_rate !== null ? `${Math.round(report.summary_snapshot!.breach_exposure_rate * 100)}%` : "No Checks"}
                  icon={<AlertTriangle className="h-5 w-5" />}
                  color="red"
                />
             </div>

             <div className="flex justify-center pt-8 border-t border-slate-100">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleGenerate}
                  className="text-slate-400 hover:text-brand-700 font-bold px-6"
                >
                  <RefreshCw className="mr-2 h-4 w-4" /> Regenerate Report
                </Button>
             </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function StatCard({ label, value, icon, color }: { label: string, value: string | number, icon: React.ReactNode, color: 'blue' | 'emerald' | 'orange' | 'red' }) {
  const colors = {
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
    orange: "bg-orange-50 text-orange-700 border-orange-100",
    red: "bg-red-50 text-red-700 border-red-100",
  };

  return (
    <Card className="p-6 border-slate-100 bg-white flex flex-col items-center gap-4 text-center">
      <div className={`h-12 w-12 rounded-2xl grid place-items-center border ${colors[color]}`}>
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">{label}</p>
        <p className="text-3xl font-black text-slate-900 tracking-tight">{value}</p>
      </div>
    </Card>
  );
}
