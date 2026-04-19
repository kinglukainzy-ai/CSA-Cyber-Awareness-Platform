"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ShieldAlert, ShieldCheck, Loader2, Search } from "lucide-react";

interface BreachWidgetProps {
  sessionId: string;
  participantUuid: string;
}

export function BreachWidget({ sessionId, participantUuid }: BreachWidgetProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ is_breached: boolean; breach_count: number } | null>(null);

  const handleCheck = async () => {
    if (!email) return;
    setLoading(true);
    try {
      const response = await api<{ is_breached: boolean; breach_count: number }>(
        `/breach/check?email=${encodeURIComponent(email)}&session_id=${sessionId}`,
        {
          headers: {
            "X-Participant-UUID": participantUuid,
            "X-Session-ID": sessionId
          }
        }
      );
      setResult(response);
    } catch (err) {
      console.error("Breach check failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-1">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-brand-50 rounded-xl">
          <Search className="h-6 w-6 text-brand-600" />
        </div>
        <div>
          <h3 className="text-xl font-black text-slate-900 tracking-tight">Breach Scout</h3>
          <p className="text-sm text-slate-500 font-medium">Identify compromised credentials in active leaks.</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          type="email"
          placeholder="email@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-12 rounded-xl border-slate-200 focus:ring-brand-500 font-medium"
        />
        <Button 
          onClick={handleCheck} 
          disabled={loading || !email}
          className="h-12 px-8 rounded-xl bg-brand-600 hover:bg-brand-700 font-bold transition-all transform active:scale-95"
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            "Scan Identity"
          )}
        </Button>
      </div>

      {result && (
        <div className={`flex items-start gap-4 p-5 rounded-2xl border transition-all animate-in zoom-in-95 duration-300 ${
          result.is_breached 
            ? "bg-red-50/50 border-red-200 text-red-900" 
            : "bg-emerald-50/50 border-emerald-200 text-emerald-900"
        }`}>
          <div className={`p-2 rounded-lg ${result.is_breached ? "bg-red-100" : "bg-emerald-100"}`}>
            {result.is_breached ? (
              <ShieldAlert className="h-6 w-6 text-red-600" />
            ) : (
              <ShieldCheck className="h-6 w-6 text-emerald-600" />
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <p className="font-black text-lg">
                {result.is_breached ? "THREAT DETECTED" : "SIGNATURE CLEAR"}
              </p>
              <div className={`h-2 w-2 rounded-full animate-pulse ${result.is_breached ? "bg-red-500" : "bg-emerald-500"}`} />
            </div>
            <p className="text-sm font-medium leading-relaxed opacity-90">
              {result.is_breached 
                ? `Critical Alert: This identity has been compromised in ${result.breach_count} historical data breaches. You are at high risk for credential stuffing.`
                : "Operational Security Check: No known exposes found for this identity in our global threat database. Maintain standard protocol."
              }
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
