"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { LiveDashboard } from "@/components/instructor/LiveDashboard";
import { PhishTracker } from "@/components/instructor/PhishTracker";
import { PollController } from "@/components/instructor/PollController";
import { ScoreBoard } from "@/components/instructor/ScoreBoard";
import { Card } from "@/components/ui/Card";
import { socket } from "@/lib/socket";
import { 
  Monitor, 
  Settings, 
  ExternalLink, 
  Share2,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function SessionDetailPage() {
  const params = useParams<{ id: string }>();
  const sessionId = params.id;

  useEffect(() => {
    if (!sessionId) {
      return;
    }

    socket.connect();
    socket.emit("join_session", { session_id: sessionId });

    return () => {
      socket.disconnect();
    };
  }, [sessionId]);

  return (
    <div className="flex flex-col gap-10">
      {/* Top Banner / Utility */}
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-brand-700">
             <Monitor className="h-4 w-4" />
             <span className="text-[10px] font-black uppercase tracking-widest">Master Control Room</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900">Engagement Command</h1>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2 border-slate-200">
            <Share2 className="h-4 w-4" /> Share Access
          </Button>
          <Button variant="outline" className="gap-2 border-slate-200">
            <Settings className="h-4 w-4" /> Configuration
          </Button>
          <Button className="gap-2 px-6">
            <ExternalLink className="h-4 w-4" /> View as Participant
          </Button>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="grid gap-10 lg:grid-cols-[1.2fr,0.8fr]">
        <div className="flex flex-col gap-10">
          <section>
            <LiveDashboard sessionId={sessionId} />
          </section>
          
          <section>
             <PollController sessionId={sessionId} />
          </section>
        </div>

        <div className="flex flex-col gap-10">
          <section>
            <ScoreBoard sessionId={sessionId} />
          </section>

          <section>
            <PhishTracker sessionId={sessionId} />
          </section>

          <Card className="flex items-center gap-4 bg-amber-50 border-amber-100 p-6 text-amber-800">
            <AlertCircle className="h-6 w-6 shrink-0" />
            <div className="flex flex-col gap-1">
              <p className="text-sm font-bold uppercase tracking-tight">System Integrity</p>
              <p className="text-xs font-medium opacity-80 leading-relaxed">
                All telemetry is synced via redundant gateways. If you notice delays, refresh the command board.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
