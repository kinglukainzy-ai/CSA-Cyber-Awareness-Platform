"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { 
  Users, 
  Plus, 
  Trash2,
  Loader2,
  X,
  ShieldAlert,
  ShieldCheck,
  UserPlus
} from "lucide-react";
import { Admin } from "@/types";
import { useRouter } from "next/navigation";

export default function AdminsPage() {
  const router = useRouter();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [currentAdmin, setCurrentAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [formData, setFormData] = useState({ full_name: "", email: "", password: "", role: "instructor" });

  const fetchData = async () => {
    try {
      const [me, all] = await Promise.all([
        api<Admin>("/auth/me"),
        api<Admin[]>("/admins")
      ]);
      
      if (me.role !== "superadmin") {
        router.push("/admin/dashboard");
        return;
      }
      
      setCurrentAdmin(me);
      setAdmins(all);
    } catch (err) {
      console.error(err);
      router.push("/admin/dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [router]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api("/admins", {
        method: "POST",
        body: JSON.stringify(formData)
      });
      fetchData();
      setDrawerOpen(false);
      setFormData({ full_name: "", email: "", password: "", role: "instructor" });
      // Toast notification would go here
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeactivate = async (id: string, name: string) => {
    if (confirm(`Remove ${name}'s access? This cannot be undone.`)) {
      try {
        await api(`/admins/${id}`, { method: "DELETE" });
        fetchData();
      } catch (err) {
        console.error(err);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-700 opacity-40" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 relative overflow-hidden">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-4xl font-black tracking-tight text-slate-900">Admin Accounts</h1>
          <p className="text-sm font-medium text-slate-500">Manage instructor credentials and system permissions.</p>
        </div>
        <Button onClick={() => setDrawerOpen(true)} className="h-11 px-6">
          <UserPlus className="h-4 w-4 mr-2" /> Add Instructor
        </Button>
      </div>

      <Card className="overflow-hidden border-none p-0 shadow-xl shadow-slate-200/50">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50">
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">FULL NAME</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">EMAIL</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">ROLE</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">CREATED</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">LAST LOGIN</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">ACTIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white text-sm">
            {admins.map((admin) => (
              <tr key={admin.id} className="group hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-5 font-bold text-slate-900">{admin.full_name}</td>
                <td className="px-6 py-5 text-slate-600">{admin.email}</td>
                <td className="px-6 py-5">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-tight ${
                    admin.role === "superadmin" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
                  }`}>
                    {admin.role === "superadmin" ? <ShieldAlert className="h-3 w-3" /> : <ShieldCheck className="h-3 w-3" />}
                    {admin.role}
                  </span>
                </td>
                <td className="px-6 py-5 text-slate-500">
                  {new Date(admin.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-5 text-slate-500">
                  {admin.last_login ? new Date(admin.last_login).toLocaleString() : "Never"}
                </td>
                <td className="px-6 py-5">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-9 w-9 p-0 text-slate-400 hover:text-red-600"
                    disabled={admin.id === currentAdmin?.id}
                    onClick={() => handleDeactivate(admin.id, admin.full_name)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Drawer */}
      {drawerOpen && (
        <>
          <div className="fixed inset-0 z-[60] bg-slate-900/20 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
          <div className="fixed inset-y-0 right-0 z-[70] w-full max-w-md border-l border-slate-200 bg-white p-8 shadow-2xl animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between border-b border-slate-100 pb-6 mb-8">
              <div>
                <h3 className="text-xl font-black text-slate-900">Provision Admin</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">NIST/CSA Compliance</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setDrawerOpen(false)} className="h-10 w-10 p-0 rounded-xl">
                 <X className="h-5 w-5" />
              </Button>
            </div>

            <form onSubmit={handleCreate} className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Full Name</label>
                <Input 
                  required 
                  value={formData.full_name} 
                  onChange={e => setFormData({...formData, full_name: e.target.value})}
                  placeholder="e.g. Kwame Mensah" 
                />
              </div>
              
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Email Address</label>
                <Input 
                  type="email"
                  required 
                  value={formData.email} 
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  placeholder="kwame@csa.gov.gh" 
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Password</label>
                <Input 
                  type="password"
                  required 
                  minLength={12}
                  value={formData.password} 
                  onChange={e => setFormData({...formData, password: e.target.value})}
                  placeholder="Min 12 characters" 
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">System Role</label>
                <select 
                  className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700/50"
                  value={formData.role}
                  onChange={e => setFormData({...formData, role: e.target.value})}
                  required
                  title="System Role"
                >
                  <option value="instructor">Instructor</option>
                  <option value="superadmin">Superadmin</option>
                </select>
              </div>

              <div className="mt-8 flex gap-3">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setDrawerOpen(false)}>Cancel</Button>
                <Button type="submit" className="flex-1">Create Account</Button>
              </div>
              
              <p className="text-[10px] text-slate-400 font-medium leading-relaxed mt-4">
                Note: Passwords must be shared securely with the instructor. They will be required to change it upon first login (if policy enabled).
              </p>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
