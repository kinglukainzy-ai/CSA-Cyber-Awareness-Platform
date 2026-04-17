"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { socket } from "@/lib/socket";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { 
  MailWarning, 
  Send, 
  History,
  AlertTriangle,
  MousePointer2,
  Eye,
  ShieldCheck,
  RotateCcw,
  Loader2,
  CheckCircle2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface PhishTemplate {
  id: string;
  name: string;
}

interface PhishEvent {
  event_type: string;
  participant_name: string;
  occurred_at: string;
}

interface PhishStats {
  sent: number;
  opened: number;
  clicked: number;
  submitted: number;
  reported: number;
}

export function PhishTracker({ sessionId }: { sessionId: string }) {
  const [stats, setStats] = useState<PhishStats>({
    sent: 0,
    opened: 0,
    clicked: 0,
    submitted: 0,
    reported: 0
  });
  const [timeline, setTimeline] = useState<PhishEvent[]>([]);
  const [templates, setTemplates] = useState<PhishTemplate[]>([]);
  const [showLaunchModal, setShowLaunchModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [campaignType, setCampaignType] = useState<"pre_session" | "live" | "post_session">("live");
  const [launching, setLaunching] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsData, templatesData] = await Promise.all([
          api<any>(`/sessions/${sessionId}/phishing/stats`),
          api<PhishTemplate[]>("/phishing/templates")
        ]);
        
        if (statsData?.stats) {
          setStats(statsData.stats);
          setTimeline(statsData.timeline || []);
        }
        setTemplates(templatesData || []);
      } catch (err) {
        console.error("Failed to fetch phishing data:", err);
      }
    };

    fetchData();

    socket.on("phish_event", (event: PhishEvent) => {
      setTimeline(prev => [event, ...prev].slice(0, 50));
      setStats(prev => ({
        ...prev,
        [event.event_type]: (prev[event.event_type as keyof PhishStats] || 0) + 1
      }));
    });

    return () => {
      socket.off("phish_event");
    };
  }, [sessionId]);

  const handleLaunch = async () => {
    if (!selectedTemplate) return;
    setLaunching(true);
    try {
      await api(`/sessions/${sessionId}/phishing/launch`, {
        method: "POST",
        body: JSON.stringify({
          template_id: selectedTemplate,
          type: campaignType
        })
      });
      setShowLaunchModal(false);
      // Stats will update via Socket.io as emails are "sent"
    } catch (err) {
      console.error("Failed to launch campaign:", err);
    } finally {
      setLaunching(false);
    }
  };

  const ProgressBar = ({ label, count, color, total }: { label: string, count: number, color: string, total: number }) => {
    const percentage = total > 0 ? (count / total) * 100 : 0;
    return (
      <div className="space-y-1.5">
        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-500">
          <span>{label}</span>
          <span className="text-slate-900">{count} ({Math.round(percentage)}%)</span>
        </div>
        <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className={`h-full rounded-full ${color}`}
          />
        </div>
      </div>
    );
  };

  return (
    <Card className="flex flex-col gap-6 p-6 border-none shadow-xl shadow-brand-700/5 bg-white/50 backdrop-blur-sm h-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-red-600 text-white shadow-lg shadow-red-600/20">
            <MailWarning className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900 leading-tight">Phish Tracker</h3>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-widest">Live Campaign Inflow</p>
          </div>
        </div>
        <Button 
          size="sm" 
          onClick={() => setShowLaunchModal(true)}
          className="gap-2 font-bold bg-red-600 hover:bg-red-700 text-white"
        >
          <Send className="h-4 w-4" /> Launch Campaign
        </Button>
      </div>

      <div className="space-y-5 p-4 rounded-3xl bg-white border border-slate-100 shadow-sm">
        <ProgressBar label="Campaign Sent" count={stats.sent} color="bg-slate-400" total={stats.sent} />
        <ProgressBar label="Emails Opened" count={stats.opened} color="bg-yellow-400" total={stats.sent} />
        <ProgressBar label="Links Clicked" count={stats.clicked} color="bg-orange-500" total={stats.sent} />
        <ProgressBar label="Data Submitted" count={stats.submitted} color="bg-red-600" total={stats.sent} />
        <ProgressBar label="Reported Safe" count={stats.reported} color="bg-emerald-500" total={stats.sent} />
      </div>

      <div className="flex-1 flex flex-col gap-3 min-h-0">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
           <History className="h-3.5 w-3.5" /> Recent Intelligence
        </div>
        <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
          <AnimatePresence initial={false}>
            {timeline.map((event, i) => (
              <motion.div 
                key={i + event.occurred_at}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100"
              >
                <div className="flex items-center gap-3">
                  <div className={`h-2 w-2 rounded-full ${
                    event.event_type === 'submitted' ? 'bg-red-600' :
                    event.event_type === 'clicked' ? 'bg-orange-500' :
                    event.event_type === 'opened' ? 'bg-yellow-400' :
                    event.event_type === 'reported' ? 'bg-emerald-500' :
                    'bg-slate-400'
                  }`} />
                  <span className="text-xs font-bold text-slate-700">
                    <span className="text-slate-400">[{new Date(event.occurred_at).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' })}]</span>
                    {" "}{event.participant_name} {event.event_type === 'opened' ? 'opened' : event.event_type === 'clicked' ? 'clicked' : event.event_type === 'submitted' ? 'submitted data' : event.event_type === 'reported' ? 'reported' : 'received'} the email
                  </span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {timeline.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-slate-300 gap-2">
              <RotateCcw className="h-8 w-8 opacity-20" />
              <p className="text-xs font-bold uppercase tracking-widest">Waiting for Mission Start</p>
            </div>
          )}
        </div>
      </div>

      {/* Launch Modal */}
      {showLaunchModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-brand-950/60 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
          >
            <div className="p-6 bg-red-600 text-white">
              <h4 className="text-xl font-black uppercase">Launch Phishing Simulation</h4>
              <p className="text-red-100 text-xs font-medium mt-1">Select a payload to deploy to the audience</p>
            </div>
            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">SELECT TEMPLATE</label>
                <select 
                  title="Select Phishing Template"
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  className="w-full h-12 px-4 rounded-xl border-2 border-slate-100 bg-slate-50 font-bold text-slate-700 focus:border-red-600 transition-all outline-none"
                >
                  <option value="">-- Choose a Payload --</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">CAMPAIGN TYPE</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["pre_session", "live", "post_session"] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setCampaignType(t)}
                      className={`h-12 rounded-xl text-[10px] font-black uppercase border-2 transition-all ${
                        campaignType === t 
                          ? "bg-red-50 border-red-600 text-red-700" 
                          : "border-slate-100 text-slate-500 hover:border-slate-200"
                      }`}
                    >
                      {t.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button 
                  variant="ghost" 
                  className="flex-1 font-bold rounded-xl"
                  onClick={() => setShowLaunchModal(false)}
                >
                  Cancel
                </Button>
                <Button 
                  className="flex-[2] font-black rounded-xl bg-red-600 hover:bg-red-700 text-white h-12 gap-2"
                  disabled={!selectedTemplate || launching}
                  onClick={handleLaunch}
                >
                  {launching ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                  DEPLOY PAYLOAD
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </Card>
  );
}
