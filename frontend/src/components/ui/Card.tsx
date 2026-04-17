import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("rounded-3xl border border-black/10 bg-white/80 p-6 shadow-sm", className)}>{children}</div>;
}
