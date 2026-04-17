"use client";

import { useEffect, useState } from "react";
import { useSocket } from "@/providers/SocketProvider";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { 
  ShieldCheck, 
  MapPin, 
  Search, 
  MousePointer2, 
  Fingerprint, 
  ChevronRight,
  AlertTriangle,
  Lightbulb
} from "lucide-react";

interface RedFlag {
  title: string;
  description: string;
}

export function TeachableMoment() {
  const { socket } = useSocket();
  const [showRedFlags, setShowRedFlags] = useState(false);

  useEffect(() => {
    if (socket) {
      socket.on("reveal_red_flags", () => {
        setShowRedFlags(true);
      });
    }

    return () => {
      if (socket) {
        socket.off("reveal_red_flags");
      }
    };
  }, [socket]);

  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto py-10 px-6 animate-in fade-in duration-700">
      {/* Hero Alert */}
      <div className="flex flex-col items-center text-center gap-4 bg-brand-900 text-white p-12 rounded-[32px] shadow-2xl overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-500 via-white to-brand-500" />
        <div className="h-16 w-16 bg-brand-800 rounded-2xl flex items-center justify-center shadow-inner border border-brand-700/50">
          <ShieldCheck className="h-8 w-8 text-brand-400" />
        </div>
        <h1 className="text-4xl font-black tracking-tight">Caught in the Act!</h1>
        <p className="text-lg text-brand-200 font-medium max-w-xl">
          Don't worry — this was a controlled training simulation by the CSA. 
          No real data was collected, but an attacker would have taken everything.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Anatomy of the Attack */}
        <div className="flex flex-col gap-6">
          <h3 className="text-xl font-bold text-slate-900 border-l-4 border-brand-600 pl-4">Anatomy of the Attack</h3>
          
          <div className="flex flex-col gap-4">
            {[
              { 
                icon: <Search className="h-5 w-5" />, 
                title: "Authority Hijacking", 
                desc: "We used real CSA logos and legal citations to make the page look 'official' and suppress your natural skepticism." 
              },
              { 
                icon: <MapPin className="h-5 w-5" />, 
                title: "Silent Geolocation", 
                desc: "The moment you loaded the page, your browser was asked for GPS data. If you clicked 'Allow', we knew exactly where you were." 
              },
              { 
                icon: <Fingerprint className="h-5 w-5" />, 
                title: "Hardware Fingerprinting", 
                desc: "Even without permissions, we profiled your device type, OS, battery level, and screen resolution to uniquely identify you." 
              }
            ].map((item, i) => (
              <Card key={i} className="p-5 border-none bg-white shadow-lg shadow-slate-200/50 flex gap-4 items-start">
                <div className="h-10 w-10 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center shrink-0">
                  {item.icon}
                </div>
                <div className="flex flex-col gap-1">
                  <h4 className="font-bold text-slate-900">{item.title}</h4>
                  <p className="text-sm text-slate-500 leading-relaxed font-medium">{item.desc}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* The Teachable Moment */}
        <div className="flex flex-col gap-6">
           <h3 className="text-xl font-bold text-slate-900 border-l-4 border-emerald-500 pl-4">The Lesson</h3>
           
           <Card className={`p-8 border-none bg-emerald-900 text-emerald-50 shadow-2xl transition-all duration-1000 ${showRedFlags ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-50 grayscale'}`}>
              {!showRedFlags ? (
                <div className="flex flex-col items-center gap-4 py-10 opacity-60">
                  <Lightbulb className="h-12 w-12 animate-pulse" />
                  <p className="font-mono text-xs uppercase tracking-widest text-center">Waiting for instructor to reveal red flags...</p>
                </div>
              ) : (
                <div className="flex flex-col gap-6 animate-in zoom-in-95 duration-500">
                  <div className="flex items-center gap-3">
                    <Badge className="bg-emerald-500 text-white border-none font-black text-[10px]">REVEALED</Badge>
                    <h4 className="text-lg font-bold">What you missed:</h4>
                  </div>
                  
                  <div className="flex flex-col gap-4">
                    {[
                      { t: "URL Discrepancy", d: "The address bar showed '.net' or '.org' instead of the official '.gov.gh'." },
                      { t: "Aggressive Urgency", d: "We used 'Immediately' and 'Required' to force a fast, emotional decision." },
                      { t: "Unexpected Request", d: "The CSA never asks for facial verification for event attendance." }
                    ].map((red, i) => (
                      <div key={i} className="flex gap-3 border-l-2 border-emerald-500/30 pl-4 py-1">
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-bold text-emerald-300 uppercase tracking-tight">{red.t}</span>
                          <p className="text-[13px] text-emerald-100 opacity-80 leading-snug">{red.d}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 pt-6 border-t border-emerald-500/20">
                     <p className="text-sm font-medium italic opacity-70">
                       "If it's urgent and unexpected, it's probably phishing. Always hover before you click."
                     </p>
                  </div>
                </div>
              )}
           </Card>

           <div className="bg-amber-50 border border-amber-200 p-6 rounded-2xl flex gap-4">
              <AlertTriangle className="h-6 w-6 text-amber-600 shrink-0" />
              <div>
                <h5 className="text-sm font-bold text-amber-900 uppercase tracking-tight">Pro-Tip</h5>
                <p className="text-sm text-amber-800 font-medium leading-relaxed">
                  Always verify communication through a known trusted channel. Call the office using the number on the official website if in doubt.
                </p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
