"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Building2,
  Terminal,
  MailWarning,
  LogOut,
  ShieldCheck,
  ChevronRight,
  Monitor,
  Users,
} from "lucide-react";
import { Logo } from "@/components/shared/Logo";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { api } from "@/lib/api";
import { Admin } from "@/types";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (pathname === "/admin/login") {
      setLoading(false);
      return;
    }

    api<Admin>("/auth/me")
      .then(setAdmin)
      .catch(() => router.push("/admin/login"))
      .finally(() => setLoading(false));
  }, [pathname, router]);

  const navItems = [
    { name: "Dashboard",          href: "/admin/dashboard",      icon: <LayoutDashboard className="h-4 w-4" /> },
    { name: "Sessions",           href: "/admin/sessions",       icon: <Monitor className="h-4 w-4" /> },
    { name: "Organisations",      href: "/admin/organisations",  icon: <Building2 className="h-4 w-4" /> },
    { name: "Challenge Library",  href: "/admin/challenges",      icon: <Terminal className="h-4 w-4" /> },
    { name: "Phishing Templates", href: "/admin/phishing",        icon: <MailWarning className="h-4 w-4" /> },
    { name: "Admin Accounts",     href: "/admin/admins",          icon: <Users className="h-4 w-4" />, superadminOnly: true },
  ];

  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-700 border-t-transparent" />
      </div>
    );
  }

  const filteredNavItems = navItems.filter(item => !item.superadminOnly || admin?.role === "superadmin");

  const handleLogout = async () => {
    try {
      await api("/auth/logout", { method: "POST" });
      router.push("/admin/login");
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-50 w-72 border-r border-slate-200 bg-white">
        <div className="flex h-full flex-col">
          <div className="p-8">
            <Logo />
          </div>

          <nav className="flex-1 space-y-1 px-4">
            {filteredNavItems.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between rounded-xl px-4 py-3 text-sm font-bold transition-all ${
                    active
                      ? "bg-brand-700 text-white shadow-lg shadow-brand-700/20"
                      : "text-slate-500 hover:bg-slate-50 hover:text-brand-700"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {item.icon}
                    {item.name}
                  </div>
                  {active && <ChevronRight className="h-4 w-4" />}
                </Link>
              );
            })}
          </nav>

          <div className="p-4">
            <Card className="flex flex-col gap-4 border-none bg-brand-700/5 p-4 text-brand-700">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Operator Session</span>
              </div>
              <p className="text-[10px] font-bold opacity-80 leading-relaxed">
                You are operating as a <span className="uppercase">{admin?.role || "Instructor"}</span>. All platform actions are logged.
              </p>
            </Card>

            <Button
              variant="ghost"
              className="mt-4 w-full justify-start text-red-600 hover:bg-red-50 hover:text-red-700"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-3" /> Sign Out
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 pl-72">
        <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur-md">
          <div className="flex h-20 items-center justify-between px-8">
            <h2 className="text-xl font-black text-slate-900">
              {navItems.find((i) => pathname.startsWith(i.href))?.name ?? "Administration"}
            </h2>

            <div className="flex items-center gap-4">
              <div className="flex flex-col items-end">
                <span className="text-sm font-bold text-slate-900">{admin?.full_name || "CSA Admin"}</span>
                <span className="text-[10px] font-black uppercase text-brand-700">Capacity Division</span>
              </div>
              <div className="h-10 w-10 rounded-xl bg-brand-700/10 shadow-inner grid place-items-center">
                <ShieldCheck className="h-5 w-5 text-brand-700" />
              </div>
            </div>
          </div>
        </header>

        <div className="p-8">{children}</div>
      </div>
    </div>
  );
}
