import { Lock, Unlock, Shield, Terminal, BookOpen, BrainCircuit } from "lucide-react";
import { Card } from "@/components/ui/Card";

interface ChallengeCardProps {
  title: string;
  category: string;
  points: number;
  locked?: boolean;
  active?: boolean;
  onClick?: () => void;
}

export function ChallengeCard({ 
  title, 
  category, 
  points, 
  locked = false, 
  active = false,
  onClick 
}: ChallengeCardProps) {
  const getIcon = () => {
    switch (category.toLowerCase()) {
      case "scenario": return <BrainCircuit className="h-5 w-5" />;
      case "ctf": return <Terminal className="h-5 w-5" />;
      case "quiz": return <BookOpen className="h-5 w-5" />;
      default: return <Shield className="h-5 w-5" />;
    }
  };

  return (
    <div 
      onClick={!locked ? onClick : undefined}
      className={`group relative cursor-pointer outline-none transition-all ${
        locked ? "cursor-not-allowed grayscale" : "hover:-translate-y-1"
      }`}
    >
      <Card className={`flex flex-col gap-4 p-5 transition-all ${
        active 
          ? "border-2 border-brand-700 bg-brand-700/5 ring-4 ring-brand-700/10" 
          : "border-slate-100 bg-white hover:border-brand-700/30 hover:shadow-xl hover:shadow-brand-700/5"
      }`}>
        <div className="flex items-center justify-between">
          <div className={`p-2 rounded-xl ${
            active ? "bg-brand-700 text-white" : "bg-slate-50 text-brand-700 group-hover:bg-brand-700/10"
          }`}>
            {getIcon()}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-widest text-slate-400">
              {points} PTS
            </span>
            {locked ? (
              <Lock className="h-4 w-4 text-slate-300" />
            ) : (
              <Unlock className="h-4 w-4 text-emerald-500" />
            )}
          </div>
        </div>

        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
            {category}
          </p>
          <h3 className="text-lg font-bold text-slate-900 leading-tight">
            {title}
          </h3>
        </div>

        {!locked && !active && (
          <div className="flex items-center gap-1.5 text-xs font-bold text-brand-700 mt-2">
            START CHALLENGE
            <div className="h-1 w-1 rounded-full bg-brand-700" />
          </div>
        )}
      </Card>
    </div>
  );
}
