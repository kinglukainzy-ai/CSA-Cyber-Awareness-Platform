import { JoinForm } from "@/components/participant/JoinForm";
import { Card } from "@/components/ui/Card";
import { Logo } from "@/components/shared/Logo";
import { ShieldCheck, Monitor, Zap } from "lucide-react";
import { Suspense } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Join Session | CSA Cyber Awareness Platform",
  description: "Securely join a live cybersecurity awareness session with the Ghana Cyber Security Authority.",
};

export default function JoinPage() {
  return (
    <div className="min-h-screen bg-slate-50/50">
      <main className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-10">
        <header>
          <Logo />
        </header>

        <section className="flex flex-1 items-center justify-center py-20">
          <div className="grid w-full items-start gap-16 lg:grid-cols-2">
            <div className="flex flex-col gap-10">
              <div className="flex flex-col gap-4">
                <h1 className="text-5xl font-extrabold tracking-tight text-slate-900">
                  Join a live awareness <br/>
                  <span className="text-brand-700">experience.</span>
                </h1>
                <p className="max-w-md text-lg leading-relaxed text-slate-600">
                  Enter the code provided by your instructor to join the live session. 
                  Get ready for real-time challenges and simulations.
                </p>
              </div>

              <div className="flex flex-col gap-6">
                {[
                  { 
                    icon: <Monitor className="h-5 w-5" />, 
                    title: "Live Interaction", 
                    desc: "See results and feedback immediately on your screen." 
                  },
                  { 
                    icon: <Zap className="h-5 w-5" />, 
                    title: "Real Scenarios", 
                    desc: "Test your skills against realistic phishing and technical labs." 
                  },
                  { 
                    icon: <ShieldCheck className="h-5 w-5" />, 
                    title: "Earn Points", 
                    desc: "Compete for a top spot on your organisation's leaderboard." 
                  }
                ].map((item, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-brand-700 shadow-lg shadow-brand-700/5">
                      {item.icon}
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-bold text-slate-900">{item.title}</span>
                      <span className="text-sm text-slate-500">{item.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-lg">
              <div className="absolute -inset-4 rounded-[40px] bg-gradient-to-tr from-brand-700/20 to-secondary/20 blur-3xl"></div>
              <Card className="relative overflow-hidden border-2 border-white bg-white/60 p-10 backdrop-blur-xl">
                <div className="mb-8 border-b border-slate-100 pb-8">
                  <h2 className="text-2xl font-bold text-slate-900">Participant Access</h2>
                  <p className="text-sm text-slate-500">Secure entry for Ghana CSA training modules.</p>
                </div>
                <Suspense fallback={
                  <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                    <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-brand-700/20 border-t-brand-700"></div>
                    <span className="text-sm font-medium">Preparing secure gateway...</span>
                  </div>
                }>
                  <JoinForm />
                </Suspense>
              </Card>
            </div>
          </div>
        </section>

        <footer className="mt-auto py-10 text-center">
          <p className="text-sm font-medium text-slate-400">
            Powered by Ghana Cyber Security Authority — Capacity Building Team
          </p>
        </footer>
      </main>
    </div>
  );
}
