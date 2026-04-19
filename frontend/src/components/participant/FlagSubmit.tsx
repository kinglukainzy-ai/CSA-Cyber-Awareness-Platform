"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Send, CheckCircle2, XCircle, Loader2 } from "lucide-react";

interface FlagSubmitProps {
  challengeId: string;
  sessionId: string;
  participantUuid: string;
  onSuccess?: () => void;
}

export function FlagSubmit({ 
  challengeId, 
  sessionId, 
  participantUuid,
  onSuccess
}: FlagSubmitProps) {
  const [flag, setFlag] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ correct: boolean } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!flag || loading) return;

    setLoading(true);
    setResult(null);
    try {
      const response = await api<{ correct: boolean }>("/serials/submit", {
        method: "POST",
        headers: { 
          "X-Participant-UUID": participantUuid,
          "X-Session-ID": sessionId
        },
        body: JSON.stringify({ 
          challenge_id: challengeId, 
          flag, 
          session_id: sessionId 
        })
      });
      setResult(response);
      if (response.correct) {
        setFlag("");
        onSuccess?.();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input 
          className={`font-mono text-sm tracking-widest ${
            result?.correct === true ? "border-emerald-500 bg-emerald-50" : 
            result?.correct === false ? "border-red-500 bg-red-50" : ""
          }`}
          value={flag} 
          onChange={(e) => setFlag(e.target.value)} 
          placeholder="CSAc{your_flag_here}" 
          disabled={loading || result?.correct === true}
        />
        <Button 
          type="submit" 
          disabled={loading || !flag || result?.correct === true}
          className="px-6"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>

      {result && (
        <div className={`flex items-center gap-2 text-sm font-bold ${
          result.correct ? "text-emerald-600" : "text-red-600"
        }`}>
          {result.correct ? (
            <>
              <CheckCircle2 className="h-4 w-4" />
              Flag Accepted! +Points Awarded
            </>
          ) : (
            <>
              <XCircle className="h-4 w-4" />
              Incorrect flag. Try again.
            </>
          )}
        </div>
      )}
    </div>
  );
}
