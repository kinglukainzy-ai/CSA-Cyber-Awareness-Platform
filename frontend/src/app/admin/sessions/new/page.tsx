"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { 
  Building2, 
  Terminal, 
  Plus, 
  ArrowRight, 
  Loader2, 
  CheckCircle2,
  AlertCircle
} from "lucide-react";

interface Organisation {
  id: string;
  name: string;
}

interface Challenge {
  id: string;
  title: string;
  category: string;
  points: number;
}

interface NewSessionPayload {
  name: string;
  org_id: string;
  challenge_ids: string[];
}

export default function NewSessionPage() {
  const router = useRouter();
  const [orgs, setOrgs] = useState<Organisation[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [selectedChallenges, setSelectedChallenges] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<NewSessionPayload>();

  const fetchData = async () => {
    try {
      const [orgList, challengeList] = await Promise.all([
        api<Organisation[]>("/organisations"),
        api<Challenge[]>("/challenges")
      ]);
      setOrgs(orgList);
      setChallenges(challengeList);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const toggleChallenge = (id: string) => {
    setSelectedChallenges(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const onSubmit = async (values: NewSessionPayload) => {
    if (selectedChallenges.length === 0) return;
    try {
      // Step 1: create the session
      const session = await api<{ id: string }>("/sessions", {
        method: "POST",
        body: JSON.stringify({ name: values.name, org_id: values.org_id }),
      });

      // Step 2: assign the selected challenges in the chosen order
      await api(`/sessions/${session.id}/challenges`, {
        method: "POST",
        body: JSON.stringify({ challenge_ids: selectedChallenges }),
      });

      router.push(`/admin/sessions/${session.id}`);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-700" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-10">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-4xl font-black tracking-tight text-slate-900">Provision Engagement</h1>
          <p className="text-sm font-medium text-slate-500">Configure a new live training session for an organisation.</p>
        </div>
        <div className="flex items-center gap-3">
           <Button variant="ghost" onClick={() => router.back()}>Cancel</Button>
           <Button type="submit" disabled={isSubmitting || selectedChallenges.length === 0} className="px-10 h-12">
             {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Deploy Session"}
           </Button>
        </div>
      </div>

      <div className="grid gap-10 lg:grid-cols-2">
        <div className="flex flex-col gap-8">
          <Card className="flex flex-col gap-6 p-8 border-none shadow-xl shadow-brand-700/5">
             <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
               <Building2 className="h-5 w-5 text-brand-700" />
               <h3 className="text-lg font-bold">Organisation & Metadata</h3>
             </div>
             
             <div className="flex flex-col gap-2">
               <label htmlFor="env-name" className="text-[10px] font-black uppercase tracking-widest text-slate-400">ENGAGEMENT NAME</label>
               <Input 
                 id="env-name"
                 {...register("name", { required: true })}
                 placeholder="e.g. Q1 Security Awareness - MTN Ghana" 
               />
             </div>

             <div className="flex flex-col gap-2">
               <label htmlFor="env-org" className="text-[10px] font-black uppercase tracking-widest text-slate-400">SELECT ORGANISATION</label>
               <select 
                 id="env-org"
                 {...register("org_id", { required: true })}
                 className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700/50"
               >
                 <option value="">Choose an organisation...</option>
                 {orgs.map(org => (
                   <option key={org.id} value={org.id}>{org.name}</option>
                 ))}
               </select>
             </div>
          </Card>

          <Card className="flex items-start gap-4 bg-emerald-50 border-emerald-100 p-6 text-emerald-800">
            <CheckCircle2 className="h-6 w-6 shrink-0" />
            <div className="flex flex-col gap-1">
              <p className="text-sm font-bold uppercase tracking-tight">Auto-Join Code</p>
              <p className="text-xs font-medium opacity-80 leading-relaxed">
                A unique session code (e.g. CSA-1234) will be automatically generated once the session is deployed.
              </p>
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Terminal className="h-5 w-5 text-brand-700" />
              <h3 className="text-lg font-bold">Mission Pipeline</h3>
            </div>
            <span className="text-xs font-black text-brand-700 bg-brand-700/10 px-3 py-1 rounded-full">
              {selectedChallenges.length} SELECTED
            </span>
          </div>

          <div className="flex flex-col gap-3 max-h-[600px] overflow-y-auto pr-2">
            {challenges.map((challenge) => {
              const selected = selectedChallenges.includes(challenge.id);
              return (
                <div 
                  key={challenge.id}
                  onClick={() => toggleChallenge(challenge.id)}
                  className={`flex cursor-pointer items-center justify-between rounded-2xl border-2 p-5 transition-all ${
                    selected 
                      ? "border-brand-700 bg-brand-700/5 shadow-lg shadow-brand-700/10" 
                      : "border-slate-100 bg-white hover:border-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                      selected ? "bg-brand-700 text-white" : "bg-slate-100 text-slate-400"
                    }`}>
                      <Plus className={`h-5 w-5 transition-transform ${selected ? "rotate-45" : ""}`} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{challenge.category}</span>
                      <span className="font-bold text-slate-900">{challenge.title}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black text-slate-900">{challenge.points} PTS</span>
                  </div>
                </div>
              );
            })}
          </div>

          {selectedChallenges.length === 0 && (
            <Card className="flex items-center gap-3 bg-amber-50 border-amber-100 p-4 text-amber-700">
               <AlertCircle className="h-4 w-4" />
               <p className="text-xs font-bold">You must select at least one mission to deploy a session.</p>
            </Card>
          )}
        </div>
      </div>
    </form>
  );
}
