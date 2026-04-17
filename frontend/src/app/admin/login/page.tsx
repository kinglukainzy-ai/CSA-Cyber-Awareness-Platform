"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Logo } from "@/components/shared/Logo";
import { Card } from "@/components/ui/Card";
import { Lock, Mail, Loader2, ArrowRight, ShieldCheck, AlertCircle } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<{ email: string; password: string }>();

  const onSubmit = async (values: { email: string; password: string }) => {
    setError(null);
    try {
      await api("/auth/login", { 
        method: "POST", 
        body: JSON.stringify(values) 
      });
      router.push("/admin/dashboard");
    } catch (err: any) {
      console.error("Login failed", err);
      try {
          const body = JSON.parse(err.message);
          setError(body.detail || "Authentication failed");
      } catch {
          setError(err.message || "An unexpected error occurred");
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 grid lg:grid-cols-2">
      <div className="flex flex-col p-10 lg:p-20 justify-between">
        <Logo />
        
        <div className="flex flex-col gap-6 max-w-md">
          <h1 className="text-5xl font-black tracking-tight text-slate-900 leading-tight">
            Authorised Access <br/>
            <span className="text-brand-700">Only.</span>
          </h1>
          <p className="text-lg text-slate-600 font-medium">
            CSA Capacity Building Portal. Secure login for instructors and system administrators.
          </p>
          
          <div className="flex items-center gap-2 rounded-xl bg-brand-700/5 p-4 text-brand-700 border border-brand-700/10">
            <ShieldCheck className="h-5 w-5 shrink-0" />
            <span className="text-sm font-bold">This connection is encrypted and monitored by CSA Ghana.</span>
          </div>
        </div>

        <div className="text-sm text-slate-400 font-bold">
          © 2026 GHANA CYBER SECURITY AUTHORITY
        </div>
      </div>

      <main className="relative flex items-center justify-center p-6 bg-white lg:bg-slate-100/50">
        <div className="absolute inset-0 hidden lg:block bg-gradient-to-br from-brand-700/5 to-secondary/5" />
        
        <Card className="relative w-full max-w-md border-none lg:border-2 lg:border-white p-10 shadow-2xl backdrop-blur-xl">
          <div className="mb-10 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-700 text-white shadow-lg shadow-brand-700/20">
              <Lock className="h-7 w-7" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">Administrator Login</h2>
            <p className="text-sm font-medium text-slate-500">Enter your credentials to manage engagements.</p>
          </div>

          {error && (
            <div className="mb-6 flex items-center gap-3 rounded-xl bg-red-50 p-4 text-sm font-bold text-red-600 border border-red-100 animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="h-5 w-5 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-black uppercase tracking-widest text-slate-400">EMAIL ADDRESS</label>
              <div className="relative">
                <Input 
                  {...register("email")} 
                  type="email" 
                  placeholder="admin@csa.gov.gh" 
                  className="pl-11"
                />
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-black uppercase tracking-widest text-slate-400">PASSWORD</label>
              <div className="relative">
                <Input 
                  {...register("password")} 
                  type="password" 
                  placeholder="••••••••••••" 
                  className="pl-11"
                />
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              </div>
            </div>

            <Button type="submit" className="h-12 text-lg mt-2" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>Sign In Securely <ArrowRight className="ml-2 h-5 w-5" /></>
              )}
            </Button>

            <a href="#" className="text-center text-sm font-bold text-slate-400 hover:text-brand-700 transition-colors">
              Forgot password? Contact Security Operations
            </a>
          </form>
        </Card>
      </main>
    </div>
  );
}
