"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useParticipantStore, resolveParticipant } from "@/lib/participant-store";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Loader2, ArrowRight, ShieldCheck as ShieldIcon } from "lucide-react";

type JoinPayload = {
  session_code: string;
  name: string;
  email: string;
};

export function JoinForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setParticipant = useParticipantStore((state) => state.setParticipant);
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<JoinPayload>();

  useEffect(() => {
    const code = searchParams.get("code");
    if (code) {
      setValue("session_code", code);
    }
  }, [searchParams, setValue]);

  const onSubmit = async (values: JoinPayload) => {
    try {
      // Use the new resolveParticipant logic for consistency
      const session = await resolveParticipant(values.session_code, values.name, values.email);
      
      if (session) {
        setParticipant({
          participantUuid: session.uuid,
          sessionId: session.session_id,
          sessionCode: session.session_code,
          name: session.name,
          email: session.email
        });
        router.push(`/session/${values.session_code}`);
      }
    } catch (err) {
      console.error("Join failed", err);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-bold text-slate-700">Session Code</label>
        <Input 
          className={errors.session_code ? "border-red-500" : ""}
          placeholder="CSA-XXXX" 
          {...register("session_code", { required: "Session code is required" })} 
        />
        {errors.session_code && <p className="text-xs font-bold text-red-500">{errors.session_code.message}</p>}
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-bold text-slate-700">Full Name</label>
        <Input 
          className={errors.name ? "border-red-500" : ""}
          placeholder="Enter your full name" 
          {...register("name", { required: "Full name is required" })} 
        />
        {errors.name && <p className="text-xs font-bold text-red-500">{errors.name.message}</p>}
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-bold text-slate-700">Work Email</label>
        <Input 
          type="email"
          className={errors.email ? "border-red-500" : ""}
          placeholder="name@company.com" 
          {...register("email", { 
            required: "Email is required",
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
              message: "Invalid email address"
            }
          })} 
        />
        {errors.email && <p className="text-xs font-bold text-red-500">{errors.email.message}</p>}
      </div>

      <Button type="submit" className="h-12 w-full text-lg shadow-lg shadow-brand-700/10" disabled={isSubmitting}>
        {isSubmitting ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <div className="flex items-center">
            Start Experience <ArrowRight className="ml-2 h-5 w-5" />
          </div>
        )}
      </Button>

      <div className="flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400">
        <ShieldIcon className="h-4 w-4 text-brand-700" />
        SECURE GATEWAY ENFORCED
      </div>
    </form>
  );
}
