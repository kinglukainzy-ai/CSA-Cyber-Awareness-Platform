import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" className="group flex items-center gap-3 transition-all hover:opacity-90">
      <div className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-brand-700 shadow-lg shadow-brand-700/20">
        <span className="text-xs font-bold text-white">CSA</span>
        <div className="absolute -right-2 -top-2 h-6 w-6 rounded-full bg-white/10 blur-md transition-all group-hover:bg-white/20"></div>
      </div>
      <div className="flex flex-col">
        <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-brand-700/80">
          Republic of Ghana
        </span>
        <span className="text-lg font-bold tracking-tight text-slate-900">
          Cyber Security Authority
        </span>
      </div>
    </Link>
  );
}
