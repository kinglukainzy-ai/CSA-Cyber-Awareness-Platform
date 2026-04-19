"use client";

import { useEffect, useState, useMemo } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { 
  Building2, 
  Plus, 
  Trash2,
  Loader2,
  Search,
  X,
  Edit2
} from "lucide-react";
import { Organisation } from "@/types";
import { useRouter } from "next/navigation";

export default function OrganisationsPage() {
  const router = useRouter();
  const [orgs, setOrgs] = useState<Organisation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organisation | null>(null);
  const [formData, setFormData] = useState({ name: "", sector: "", contact: "", email: "" });

  const fetchOrgs = async () => {
    try {
      const data = await api<Organisation[]>("/organisations");
      setOrgs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrgs();
  }, []);

  const filteredOrgs = useMemo(() => {
    return orgs.filter(o => 
      o.name.toLowerCase().includes(search.toLowerCase()) || 
      o.sector?.toLowerCase().includes(search.toLowerCase())
    );
  }, [orgs, search]);

  const handleOpenCreate = () => {
    setEditingOrg(null);
    setFormData({ name: "", sector: "", contact: "", email: "" });
    setDrawerOpen(true);
  };

  const handleOpenEdit = (org: Organisation) => {
    setEditingOrg(org);
    setFormData({ 
      name: org.name, 
      sector: org.sector || "", 
      contact: org.contact || "", 
      email: org.email || "" 
    });
    setDrawerOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingOrg) {
        await api(`/organisations/${editingOrg.id}`, {
          method: "PUT",
          body: JSON.stringify(formData)
        });
      } else {
        await api("/organisations", {
          method: "POST",
          body: JSON.stringify(formData)
        });
      }
      fetchOrgs();
      setDrawerOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col gap-8 relative overflow-hidden">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-4xl font-black tracking-tight text-slate-900">Organisations</h1>
          <p className="text-sm font-medium text-slate-500">Manage partner identities and sector categorisation.</p>
        </div>
        <Button onClick={handleOpenCreate} className="h-11 px-6">
          <Plus className="h-4 w-4 mr-2" /> New Organisation
        </Button>
      </div>

      <div className="flex flex-col gap-6">
        <div className="relative max-w-md">
          <Input 
            className="pl-11" 
            placeholder="Filter by name or sector..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        </div>

        <Card className="overflow-hidden border-none p-0 shadow-xl shadow-slate-200/50">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">NAME</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">SECTOR</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">CONTACT</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">SESSIONS</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">CREATED</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white text-sm">
              {filteredOrgs.map((org) => (
                <tr key={org.id} className="group hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-5">
                    <button 
                      onClick={() => router.push(`/admin/sessions?org=${org.id}`)}
                      className="text-left hover:text-brand-700 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-700/10 text-brand-700 font-black">
                          {org.name.charAt(0)}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900">{org.name}</span>
                          <span className="text-xs text-slate-500 font-medium">{org.email}</span>
                        </div>
                      </div>
                    </button>
                  </td>
                  <td className="px-6 py-5">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-tight text-slate-600">
                      {org.sector || "Other"}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-900">{org.contact || "N/A"}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5 font-bold text-slate-900">{org.session_count || 0}</td>
                  <td className="px-6 py-5 text-slate-500">
                    {new Date(org.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" className="h-9 w-9 p-0" onClick={() => handleOpenEdit(org)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {loading && (
                  <tr>
                      <td colSpan={6} className="py-20 text-center text-slate-300">
                          <Loader2 className="h-8 w-8 mx-auto animate-spin" />
                      </td>
                  </tr>
              )}
              {filteredOrgs.length === 0 && !loading && (
                  <tr>
                      <td colSpan={6} className="py-20">
                          <div className="mx-auto max-w-sm flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-200 rounded-3xl opacity-40">
                              <Building2 className="h-10 w-10 mb-2" />
                              <p className="font-bold">No organisations found</p>
                          </div>
                      </td>
                  </tr>
              )}
            </tbody>
          </table>
        </Card>
      </div>

      {/* Drawer */}
      {drawerOpen && (
        <>
          <div className="fixed inset-0 z-[60] bg-slate-900/20 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
          <div className="fixed inset-y-0 right-0 z-[70] w-full max-w-md border-l border-slate-200 bg-white p-8 shadow-2xl animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between border-b border-slate-100 pb-6 mb-8">
              <div>
                <h3 className="text-xl font-black text-slate-900">{editingOrg ? "Edit Organisation" : "New Organisation"}</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Identity Profile</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setDrawerOpen(false)} className="h-10 w-10 p-0 rounded-xl">
                 <X className="h-5 w-5" />
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Organisation Name</label>
                <Input 
                  required 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g. Bank of Ghana" 
                />
              </div>
              
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sector</label>
                <select 
                  title="Select Sector"
                  className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700/50"
                  value={formData.sector}
                  onChange={e => setFormData({...formData, sector: e.target.value})}
                  required
                >
                  <option value="">Select sector...</option>
                  {["banking", "govt", "telco", "education", "healthcare", "ngo", "other"].map(s => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Contact Name</label>
                <Input 
                  value={formData.contact} 
                  onChange={e => setFormData({...formData, contact: e.target.value})}
                  placeholder="Full name" 
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Contact Email</label>
                <Input 
                  type="email" 
                  value={formData.email} 
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  placeholder="email@example.com" 
                />
              </div>

              <div className="mt-4 flex gap-3">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setDrawerOpen(false)}>Cancel</Button>
                <Button type="submit" className="flex-1">Save Changes</Button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
