"use client";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { CheckCircle, XCircle } from "lucide-react";

export function ScenarioChallenge({ challenge }: { challenge: any }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const content = challenge.content;
  const selectedOption = content?.options?.find((o: any) => o.id === selected);

  return (
    <div className="flex flex-col gap-6">
      <p className="text-slate-700 leading-relaxed">{content?.description}</p>
      <p className="font-bold text-slate-900">{content?.question}</p>
      <div className="flex flex-col gap-3">
        {content?.options?.map((option: any) => (
          <button
            key={option.id}
            disabled={submitted}
            onClick={() => setSelected(option.id)}
            className={`w-full rounded-xl border-2 p-4 text-left transition-all ${
              selected === option.id
                ? "border-brand-700 bg-brand-700/5"
                : "border-slate-200 hover:border-slate-300"
            } ${submitted ? "cursor-not-allowed" : "cursor-pointer"}`}
          >
            <span className="font-medium text-slate-800">{option.text}</span>
          </button>
        ))}
      </div>
      {!submitted && selected && (
        <Button onClick={() => setSubmitted(true)} className="w-full">
          Submit Answer
        </Button>
      )}
      {submitted && selectedOption && (
        <div className={`rounded-xl p-6 flex gap-4 items-start ${
          selectedOption.is_correct ? "bg-emerald-50 border border-emerald-200" : "bg-red-50 border border-red-200"
        }`}>
          {selectedOption.is_correct
            ? <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            : <XCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />}
          <div className="flex flex-col gap-2">
            <p className="font-bold text-slate-900">
              {selectedOption.is_correct ? "Correct" : "Incorrect"}
            </p>
            <p className="text-sm text-slate-600">{selectedOption.feedback}</p>
            {content?.debrief && (
              <p className="text-sm text-slate-500 border-t border-slate-200 pt-2 mt-2">{content.debrief}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
