"use client";
import { useState } from "react";
import { CheckCircle, XCircle } from "lucide-react";

export function DecisionChallenge({ challenge }: { challenge: any }) {
  const content = challenge.content;
  const [currentStageId, setCurrentStageId] = useState<string>(content?.stages?.[0]?.id);
  const [ending, setEnding] = useState<any>(null);

  const currentStage = content?.stages?.find((s: any) => s.id === currentStageId);

  const handleOption = (option: any) => {
    if (content?.endings?.[option.next]) {
      setEnding({ ...content.endings[option.next], points: option.points });
    } else {
      setCurrentStageId(option.next);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <p className="text-slate-700 leading-relaxed">{content?.scenario}</p>
      {!ending && currentStage && (
        <div className="flex flex-col gap-4">
          <p className="font-bold text-slate-900">{currentStage.prompt}</p>
          <div className="flex flex-col gap-3">
            {currentStage.options?.map((option: any) => (
              <button
                key={option.id}
                onClick={() => handleOption(option)}
                className="w-full rounded-xl border-2 border-slate-200 p-4 text-left font-medium text-slate-800 hover:border-brand-700 hover:bg-brand-700/5 transition-all"
              >
                {option.text}
              </button>
            ))}
          </div>
        </div>
      )}
      {ending && (
        <div className={`rounded-xl p-6 flex gap-4 items-start ${
          ending.points > 0 ? "bg-emerald-50 border border-emerald-200" : "bg-red-50 border border-red-200"
        }`}>
          {ending.points > 0
            ? <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            : <XCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />}
          <div className="flex flex-col gap-1">
            <p className="font-bold text-slate-900">{ending.points > 0 ? "Good decision" : "Poor decision"}</p>
            <p className="text-sm text-slate-600">{ending.message}</p>
            <p className="text-xs font-bold text-slate-500">{ending.points} points</p>
          </div>
        </div>
      )}
    </div>
  );
}
