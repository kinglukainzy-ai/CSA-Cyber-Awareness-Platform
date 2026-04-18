import { BreachWidget } from "@/components/participant/BreachWidget";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/shared/Logo";
import Link from 'next/link';
import { Shield, Users, Trophy, MailWarning } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50/50">
      <main className="mx-auto max-w-7xl px-6 py-10">
        <header className="flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-4">
            <Link href="/admin/login">
              <Button variant="ghost">Admin Portal</Button>
            </Link>
            <Link href="/join">
              <Button className="px-8">Join Session</Button>
            </Link>
          </div>
        </header>

        <section className="mt-20 grid items-center gap-16 lg:grid-cols-2">
          <div className="flex flex-col gap-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-700/10 px-4 py-2 text-sm font-bold text-brand-700">
              <Shield className="h-4 w-4" />
              CAPACITY BUILDING DIVISION
            </div>
            
            <h1 className="text-6xl font-extrabold tracking-tight text-slate-900 lg:text-7xl">
              Live Cybersecurity <br/>
              <span className="text-brand-700">Engagement.</span>
            </h1>
            
            <p className="max-w-xl text-xl leading-relaxed text-slate-600">
              The official CSA platform for instructor-led training. Run live phishing drills, 
              CTF challenges, and scenario exercises with real-time feedback for your entire organisation.
            </p>

            <div className="flex flex-wrap gap-4">
              <Link href="/join">
                <Button className="h-14 px-10 text-lg">Enter Session Code</Button>
              </Link>
              <Button variant="outline" className="h-14 px-10 text-lg">Platform Tour</Button>
            </div>

            <div className="grid grid-cols-3 gap-6 pt-8 border-t border-slate-200">
              <div className="flex flex-col gap-1">
                <span className="text-2xl font-bold text-slate-900">100+</span>
                <span className="text-sm font-medium text-slate-500">Live Scenarios</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-2xl font-bold text-slate-900">Real-time</span>
                <span className="text-sm font-medium text-slate-500">Scoreboards</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-2xl font-bold text-slate-900">Detailed</span>
                <span className="text-sm font-medium text-slate-500">Reporting</span>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-4 rounded-[40px] bg-gradient-to-tr from-brand-700/20 to-secondary/20 blur-3xl"></div>
            <Card className="relative overflow-hidden border-2 border-white bg-white/60 p-8 backdrop-blur-xl">
              <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-700 text-white shadow-lg">
                <MailWarning className="h-6 w-6" />
              </div>
              <BreachWidget sessionId="" participantUuid="" />
            </Card>
            
            <Card className="absolute -bottom-10 -left-10 hidden w-64 border-2 border-white bg-white/80 p-6 shadow-2xl backdrop-blur-xl lg:block">
              <div className="flex items-center gap-4">
                <div className="flex -space-x-3">
                  {[1,2,3].map(i => (
                    <div key={i} className="h-10 w-10 rounded-full border-2 border-white bg-slate-200 shadow-sm"></div>
                  ))}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-slate-900">42 Joined</span>
                  <span className="text-[10px] uppercase font-bold text-brand-700">Live Session</span>
                </div>
              </div>
            </Card>
          </div>
        </section>

        <section className="mt-40 grid gap-12 lg:grid-cols-3">
          {[
            { 
              icon: <Users className="h-6 w-6" />, 
              title: "Instructor Led", 
              desc: "Guided sessions where instructors control the flow of challenges and reveal results live." 
            },
            { 
              icon: <MailWarning className="h-6 w-6" />, 
              title: "Ad-hoc Phishing", 
              desc: "Launch targeted phishing drills mid-session to test real-world user suspicion and reporting." 
            },
            { 
              icon: <Trophy className="h-6 w-6" />, 
              title: "Gamified CTF", 
              desc: "Competition-style challenges that keep participants engaged while testing their technical security knowledge." 
            }
          ].map((feature, i) => (
            <div key={i} className="group flex flex-col gap-4 rounded-3xl p-8 transition-all hover:bg-white hover:shadow-xl hover:shadow-brand-700/5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-brand-700 shadow-lg shadow-brand-700/10 group-hover:bg-brand-700 group-hover:text-white transition-colors">
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold text-slate-900">{feature.title}</h3>
              <p className="leading-relaxed text-slate-600">{feature.desc}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="mt-40 border-t border-slate-200 bg-white py-12">
        <div className="mx-auto max-w-7xl px-6 flex flex-col items-center justify-between gap-6 md:flex-row">
          <Logo />
          <p className="text-sm text-slate-500 font-medium">© 2026 Ghana Cyber Security Authority. All rights reserved.</p>
          <div className="flex gap-8 text-sm font-bold text-slate-600">
            <a href="#" className="hover:text-brand-700">Privacy Policy</a>
            <a href="#" className="hover:text-brand-700">Terms of Use</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
