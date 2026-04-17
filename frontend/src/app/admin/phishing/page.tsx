"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  Plus, 
  Mail, 
  Edit2, 
  Copy, 
  Trash2, 
  Eye, 
  X, 
  AlertCircle,
  Loader2,
  Calendar,
  ExternalLink,
  Info
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Editor from "@monaco-editor/react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

interface PhishTemplate {
  id: string;
  name: string;
  category: string;
  subject: string;
  body_html: string;
  created_at: string;
}

const CATEGORIES = [
  { id: "generic", label: "Generic", color: "bg-slate-100 text-slate-700" },
  { id: "banking", label: "Banking", color: "bg-blue-100 text-blue-700" },
  { id: "govt", label: "Government", color: "bg-emerald-100 text-emerald-700" },
  { id: "it_support", label: "IT Support", color: "bg-zinc-100 text-zinc-700" },
  { id: "momo", label: "Mobile Money", color: "bg-orange-100 text-orange-700" },
  { id: "hr", label: "HR / Payroll", color: "bg-purple-100 text-purple-700" },
];

export default function PhishingTemplatesPage() {
  const [templates, setTemplates] = useState<PhishTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Partial<PhishTemplate> | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<PhishTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<PhishTemplate[]>("/phishing/templates");
      setTemplates(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleCreate = () => {
    setEditingTemplate({
      name: "",
      category: "generic",
      subject: "",
      body_html: "<h1>Hello {{PARTICIPANT_NAME}}</h1>\n<p>Your action is required.</p>\n<a href=\"{{CLICK_URL}}\">Click here</a>\n<img src=\"{{OPEN_URL}}\" width=\"1\" height=\"1\">"
    });
    setDrawerOpen(true);
  };

  const handleEdit = (template: PhishTemplate) => {
    setEditingTemplate(template);
    setDrawerOpen(true);
  };

  const handleClone = async (template: PhishTemplate) => {
    try {
      await api("/phishing/templates", {
        method: "POST",
        body: JSON.stringify({
          ...template,
          id: undefined,
          name: `${template.name} (Copy)`
        })
      });
      fetchTemplates();
    } catch (err) {
      alert("Failed to clone template");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api(`/phishing/templates/${id}`, { method: "DELETE" });
      setConfirmDelete(null);
      fetchTemplates();
    } catch (err: any) {
      if (err.status === 409) {
        alert("Template is used in one or more campaigns and cannot be deleted.");
      } else {
        alert("Delete failed: " + err.message);
      }
      setConfirmDelete(null);
    }
  };

  const saveTemplate = async () => {
    setSaving(true);
    try {
      if (editingTemplate?.id) {
        await api(`/phishing/templates/${editingTemplate.id}`, {
          method: "PUT",
          body: JSON.stringify(editingTemplate)
        });
      } else {
        await api("/phishing/templates", {
          method: "POST",
          body: JSON.stringify(editingTemplate)
        });
      }
      setDrawerOpen(false);
      fetchTemplates();
    } catch (err) {
      alert("Save failed");
    } finally {
      setSaving(false);
    }
  };

  // Preview helper
  const getPreviewHTML = (html: string) => {
    return html
      .replace(/{{CLICK_URL}}/g, "#phishing-link-preview")
      .replace(/{{OPEN_URL}}/g, "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7")
      .replace(/{{PARTICIPANT_NAME}}/g, "Preview User");
  };

  return (
    <div className="flex flex-col gap-8 min-h-screen pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Phishing Templates</h1>
          <p className="text-slate-500 font-medium">Design and manage lures for simulation campaigns</p>
        </div>
        <Button onClick={handleCreate} className="h-12 px-6 rounded-xl shadow-lg shadow-brand-700/20">
          <Plus className="h-5 w-5 mr-2" /> New Template
        </Button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
           <Loader2 className="h-10 w-10 animate-spin text-brand-700 mb-4" />
           <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Accessing template vault...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => {
            const cat = CATEGORIES.find(c => c.id === template.category) || CATEGORIES[0];
            return (
              <motion.div key={template.id} layout>
                <Card className="border-slate-100 hover:border-brand-300 transition-all hover:shadow-xl hover:-translate-y-1 group bg-white h-full flex flex-col">
                  <div className="p-6 flex-1">
                    <div className="flex items-start justify-between mb-4">
                      <Badge className={`${cat.color} font-black uppercase text-[9px] tracking-widest px-3`}>
                        {cat.label}
                      </Badge>
                      <Mail className="h-5 w-5 text-slate-200 group-hover:text-brand-300 transition-colors" />
                    </div>
                    
                    <h3 className="text-xl font-bold text-slate-900 mb-2 truncate">{template.name}</h3>
                    <p className="text-sm text-slate-500 line-clamp-2 italic mb-4">
                      "{template.subject}"
                    </p>
                    
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <Calendar className="h-3 w-3" />
                      {new Date(template.created_at).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-50 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(template)} className="h-8 w-8 p-0 text-slate-500 hover:text-brand-700">
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleClone(template)} className="h-8 w-8 p-0 text-slate-500 hover:text-indigo-600">
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => { setPreviewTemplate(template); setPreviewOpen(true); }} className="h-8 w-8 p-0 text-slate-500 hover:text-emerald-600">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(template.id)} className="h-8 w-8 p-0 text-slate-400 hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* New/Edit Drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDrawerOpen(false)} className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm" />
            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 30 }} className="fixed inset-y-0 right-0 z-[101] w-full max-w-2xl bg-white shadow-2xl flex flex-col">
              <header className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h2 className="text-xl font-black text-slate-900">{editingTemplate?.id ? 'Edit Template' : 'New Template'}</h2>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Refine the phishing payload</p>
                </div>
                <Button variant="ghost" onClick={() => setDrawerOpen(false)} className="h-10 w-10 p-0 rounded-xl"><X className="h-5 w-5" /></Button>
              </header>

              <div className="flex-1 overflow-y-auto p-8 space-y-8">
                <div className="grid gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase text-slate-400 tracking-widest">Template Name</label>
                    <Input value={editingTemplate?.name} onChange={e => setEditingTemplate(prev => ({ ...prev!, name: e.target.value }))} />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase text-slate-400 tracking-widest">Category</label>
                    <select 
                      title="Select Category"
                      value={editingTemplate?.category} 
                      onChange={e => setEditingTemplate(prev => ({ ...prev!, category: e.target.value }))} 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 h-11 text-sm font-bold outline-none focus:ring-2 focus:ring-brand-700/20"
                    >  {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase text-slate-400 tracking-widest">Email Subject</label>
                    <Input value={editingTemplate?.subject} onChange={e => setEditingTemplate(prev => ({ ...prev!, subject: e.target.value }))} />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black uppercase text-slate-400 tracking-widest">HTML Body</label>
                      <div className="flex items-center gap-2 group relative">
                        <Info className="h-3 w-3 text-brand-600" />
                        <span className="text-[10px] font-bold text-brand-700 cursor-help">Available Placeholders</span>
                        <div className="absolute bottom-full right-0 mb-2 w-64 bg-slate-900 text-white p-3 rounded-lg text-[10px] space-y-1 hidden group-hover:block z-20 shadow-2xl">
                           <p><code className="text-brand-400 font-mono">{"{{CLICK_URL}}"}</code> - Tracking link for buttons</p>
                           <p><code className="text-brand-400 font-mono">{"{{OPEN_URL}}"}</code> - 1x1 tracking pixel source</p>
                           <p><code className="text-brand-400 font-mono">{"{{PARTICIPANT_NAME}}"}</code> - Full name of victim</p>
                        </div>
                      </div>
                    </div>
                    <div className="border-2 border-slate-100 rounded-2xl overflow-hidden shadow-inner">
                      <Editor height="400px" defaultLanguage="html" value={editingTemplate?.body_html} onChange={val => setEditingTemplate(prev => ({ ...prev!, body_html: val || "" }))} theme="vs-light" options={{ minimap: { enabled: false }, fontSize: 13, fontWeight: "600", padding: { top: 16 } }} />
                    </div>
                  </div>
                </div>
              </div>

              <footer className="p-8 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-4">
                <Button variant="ghost" onClick={() => setDrawerOpen(false)}>Cancel</Button>
                <Button onClick={saveTemplate} disabled={saving} className="min-w-[140px] shadow-lg shadow-brand-700/20">
                  {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : editingTemplate?.id ? 'Update Template' : 'Create Template'}
                </Button>
              </footer>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Preview Modal */}
      <AnimatePresence>
        {previewOpen && previewTemplate && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-6">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full h-full bg-white rounded-3xl overflow-hidden flex flex-col relative shadow-2xl">
               <header className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <div className="flex items-center gap-4">
                     <div className="h-10 w-10 bg-brand-700 rounded-xl grid place-items-center"><Eye className="h-5 w-5 text-white" /></div>
                     <div>
                        <h2 className="text-xl font-black text-slate-900">Campaign Preview</h2>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Simulated rendering of the payload</p>
                     </div>
                  </div>
                  <Button variant="ghost" onClick={() => setPreviewOpen(false)} className="h-10 w-10 p-0 rounded-xl"><X className="h-5 w-5" /></Button>
               </header>
               
               <div className="flex-1 flex overflow-hidden lg:flex-row flex-col">
                  {/* Left: Code */}
                  <div className="lg:w-1/3 border-r border-slate-100 flex flex-col bg-slate-50/50">
                     <div className="p-4 border-b border-slate-100 bg-white">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Source HTML</p>
                     </div>
                     <div className="flex-1">
                        <Editor height="100%" defaultLanguage="html" value={previewTemplate.body_html} theme="vs-dark" options={{ readOnly: true, minimap: { enabled: false }, fontSize: 12, lineNumbers: "on" }} />
                     </div>
                  </div>
                  
                  {/* Right: Render */}
                  <div className="lg:w-2/3 flex flex-col bg-slate-200/20">
                     <div className="p-4 bg-white border-b border-slate-100 flex items-center gap-4">
                        <div className="flex-1 bg-slate-100 rounded-full px-4 py-2 text-xs font-bold text-slate-500 flex items-center gap-2">
                           <Info className="h-3 w-3" />
                           Preview Environment: Placeholders Auto-Replaced
                        </div>
                     </div>
                     <div className="flex-1 p-8 overflow-auto">
                        <Card className="max-w-3xl mx-auto border-none shadow-xl bg-white min-h-full">
                           <div className="p-6 border-b border-slate-50 bg-slate-50/30">
                              <p className="text-xs font-bold text-slate-400 mb-1 tracking-tight">Subject: <span className="text-slate-900">{previewTemplate.subject}</span></p>
                              <p className="text-xs font-bold text-slate-400 tracking-tight">From: <span className="text-slate-900">CSA Simulator &lt;spoof@csa.gov.gh&gt;</span></p>
                           </div>
                           <iframe 
                             title="Phishing Email Preview"
                             className="w-full min-h-[500px] p-8 border-none" 
                             sandbox="allow-same-origin" 
                             srcDoc={getPreviewHTML(previewTemplate.body_html)} 
                           />
                        </Card>
                     </div>
                  </div>
               </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[300] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6">
            <Card className="w-full max-w-md p-8 text-center bg-white border-none shadow-2xl">
               <div className="h-16 w-16 bg-red-100 text-red-600 rounded-full grid place-items-center mx-auto mb-6">
                  <AlertCircle className="h-8 w-8" />
               </div>
               <h3 className="text-2xl font-black text-slate-900 mb-2">Are you sure?</h3>
               <p className="text-slate-500 font-medium mb-8">This template cannot be deleted if it has been used in a campaign. This action is irreversible.</p>
               <div className="flex items-center gap-4">
                  <Button variant="ghost" className="flex-1" onClick={() => setConfirmDelete(null)}>Cancel</Button>
                  <Button variant="destructive" className="flex-1" onClick={() => handleDelete(confirmDelete)}>Delete Template</Button>
               </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
