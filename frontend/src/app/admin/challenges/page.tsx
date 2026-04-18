"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  Plus, 
  Search, 
  Filter, 
  Edit2, 
  Copy, 
  Trash2, 
  X, 
  Check, 
  MoreVertical,
  AlertCircle,
  Loader2,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Editor from "@monaco-editor/react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

interface Challenge {
  id: string;
  title: string;
  category: string;
  type: string;
  difficulty: string;
  points: number;
  is_active: boolean;
  content: any;
}

const TEMPLATES = {
  scenario: {
    description: "Describe the situation the participant finds themselves in.",
    media: [],
    question: "What should you do?",
    options: [
      { id: "a", text: "Option A", is_correct: false, feedback: "Explain why this is wrong." },
      { id: "b", text: "Option B", is_correct: true, feedback: "Explain why this is correct." }
    ],
    debrief: "Explain the key lesson after the answer is revealed."
  },
  ctf: {
    description: "Describe what the participant needs to find.",
    serial_instructions: "Run: python3 -c \"import sys,hashlib; s='YOUR_SERIAL'; c='CHALLENGE_ID'; print(f'CSAc{hashlib.sha256(f\"{s}:{c}\".encode()).hexdigest()[:24]}')\"",
    decoy_context: "Describe where decoy serials are hidden.",
    hints_teaser: "Stuck? Use hints — but each one costs points."
  },
  quiz: {
    questions: [
      {
        id: "q1",
        text: "Question text here",
        options: [
          { id: "a", text: "Option A", is_correct: false, feedback: "Feedback here." },
          { id: "b", text: "Option B", is_correct: true, feedback: "Feedback here." }
        ],
        points: 50
      }
    ],
    total_points: 100
  },
  decision: {
    scenario: "Describe the opening situation.",
    stages: [
      {
        id: "s1",
        prompt: "What do you do?",
        options: [
          { id: "a", text: "Good choice", next: "end_good", points: 100 },
          { id: "b", text: "Bad choice", next: "end_bad", points: 0 }
        ]
      }
    ],
    endings: {
      end_good: { message: "Correct outcome explanation.", points: 100 },
      end_bad: { message: "Wrong outcome explanation.", points: 0 }
    }
  }
};

const CATEGORIES = ["phishing", "social_engineering", "password", "safe_browsing", "data_handling", "incident_response"];
const TYPES = ["scenario", "ctf", "quiz", "decision"];
const DIFFICULTIES = ["easy", "medium", "hard"];

export default function ChallengeLibraryPage() {
  // State
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Filters
  const [filters, setFilters] = useState({
    category: "All",
    type: "All",
    difficulty: "All",
    search: ""
  });
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingChallenge, setEditingChallenge] = useState<Partial<Challenge> | null>(null);
  const [jsonContent, setJsonContent] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(filters.search);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [filters.search]);

  const fetchChallenges = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (filters.category !== "All") query.append("category", filters.category);
      if (filters.type !== "All") query.append("type", filters.type);
      if (filters.difficulty !== "All") query.append("difficulty", filters.difficulty);
      // Backend handling for search might vary, common is 'q' or 'title'
      // But prompt says client-side debounced search? Actually, table filtered by title
      
      const data = await api<Challenge[]>(`/challenges?${query.toString()}`);
      
      // Client-side filtering as per requirement for search
      let filtered = data;
      if (debouncedSearch) {
        filtered = data.filter(c => c.title.toLowerCase().includes(debouncedSearch.toLowerCase()));
      }
      
      setChallenges(filtered);
      setTotal(filtered.length);
    } catch (err: any) {
      setError(err.message || "Failed to load challenges");
    } finally {
      setLoading(false);
    }
  }, [filters, debouncedSearch]);

  useEffect(() => {
    fetchChallenges();
  }, [fetchChallenges]);

  const handleToggleStatus = async (challenge: Challenge) => {
    try {
      await api(`/challenges/${challenge.id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: !challenge.is_active })
      });
      fetchChallenges();
    } catch (err: any) {
      alert("Failed to update status: " + err.message);
    }
  };

  const handleClone = async (challenge: Challenge) => {
    try {
      await api(`/challenges`, {
        method: "POST",
        body: JSON.stringify({
          ...challenge,
          id: undefined,
          title: `Copy of ${challenge.title}`
        })
      });
      fetchChallenges();
    } catch (err: any) {
      alert("Failed to clone: " + err.message);
    }
  };

  const openDrawer = (challenge: Partial<Challenge> | null = null) => {
    if (challenge) {
      setEditingChallenge(challenge);
      setJsonContent(JSON.stringify(challenge.content || TEMPLATES[challenge.type as keyof typeof TEMPLATES] || {}, null, 2));
    } else {
      setEditingChallenge({
        title: "",
        category: "phishing",
        type: "scenario",
        difficulty: "easy",
        points: 100,
        is_active: true
      });
      setJsonContent(JSON.stringify(TEMPLATES.scenario, null, 2));
    }
    setJsonError(null);
    setDrawerOpen(true);
  };

  const handleTypeChange = (newType: string) => {
    setEditingChallenge(prev => ({ ...prev, type: newType }));
    const template = TEMPLATES[newType as keyof typeof TEMPLATES];
    if (template) {
      setJsonContent(JSON.stringify(template, null, 2));
    }
  };

  const saveChallenge = async () => {
    setJsonError(null);
    try {
      const parsed = JSON.parse(jsonContent);
      setSaving(true);
      
      const payload = { ...editingChallenge, content: parsed };
      
      if (editingChallenge?.id) {
        await api(`/challenges/${editingChallenge.id}`, {
          method: "PUT",
          body: JSON.stringify(payload)
        });
      } else {
        await api(`/challenges`, {
          method: "POST",
          body: JSON.stringify(payload)
        });
      }
      
      setDrawerOpen(false);
      fetchChallenges();
    } catch (err: any) {
      if (err instanceof SyntaxError) {
        setJsonError("Invalid JSON structure");
      } else {
        setJsonError(err.message || "Save failed");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 min-h-screen pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Challenge Library</h1>
          <p className="text-slate-500 font-medium">Manage and create educational cybersecurity sessions</p>
        </div>
        <Button onClick={() => openDrawer()} className="h-12 px-6 rounded-xl shadow-lg shadow-brand-700/20">
          <Plus className="h-5 w-5 mr-2" /> New Challenge
        </Button>
      </div>

      {/* Filter Bar */}
      <Card className="p-4 border-slate-100 shadow-sm bg-white overflow-x-auto">
        <div className="flex flex-wrap items-center gap-4 min-w-[800px]">
          <div className="flex-1 max-w-sm relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search challenges by title..." 
              className="pl-11"
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase text-slate-400 tracking-widest">Category</span>
            <select 
              title="Filter by Category"
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-brand-700/20 outline-none"
              value={filters.category}
              onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
            >
              <option value="All">All Categories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase text-slate-400 tracking-widest">Type</span>
            <select 
              title="Filter by Type"
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-brand-700/20 outline-none"
              value={filters.type}
              onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
            >
              <option value="All">All Types</option>
              {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase text-slate-400 tracking-widest">Difficulty</span>
            <select 
              title="Filter by Difficulty"
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-brand-700/20 outline-none"
              value={filters.difficulty}
              onChange={(e) => setFilters(prev => ({ ...prev, difficulty: e.target.value }))}
            >
              <option value="All">All Difficulties</option>
              {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card className="border-slate-100 shadow-xl shadow-slate-200/50 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-50 bg-slate-50/50">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Challenge</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Category</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Type</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Difficulty</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Points</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-brand-700 mx-auto mb-4" />
                    <p className="text-sm font-bold text-slate-400 tracking-widest">LOADING REPOSITORY...</p>
                  </td>
                </tr>
              ) : challenges.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center">
                    <AlertCircle className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                    <p className="font-bold text-slate-400">No challenges found matching your filters</p>
                  </td>
                </tr>
              ) : (
                challenges.slice((page - 1) * 20, page * 20).map((challenge) => (
                  <tr key={challenge.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-900 group-hover:text-brand-700 transition-colors">{challenge.title}</p>
                      <p className="text-[10px] text-slate-400 font-medium">ID: {challenge.id.slice(0, 8)}...</p>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className="capitalize bg-slate-50 border-slate-200 text-slate-600 font-bold px-3">
                        {challenge.category.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Badge className="bg-brand-50 text-brand-700 border-brand-100 font-black px-3">
                        {challenge.type}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Badge className={`font-bold px-3 ${
                        challenge.difficulty === 'hard' ? 'bg-red-50 text-red-700 border-red-100' :
                        challenge.difficulty === 'medium' ? 'bg-orange-50 text-orange-700 border-orange-100' :
                        'bg-emerald-50 text-emerald-700 border-emerald-100'
                      }`}>
                        {challenge.difficulty}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 font-black text-slate-700">{challenge.points}</td>
                    <td className="px-6 py-4">
                      <button 
                         onClick={() => handleToggleStatus(challenge)}
                         title="Toggle Active Status"
                         aria-label={challenge.is_active ? "Deactivate challenge" : "Activate challenge"}
                         className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${challenge.is_active ? 'bg-brand-700' : 'bg-slate-200'}`}
                      >
                         <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${challenge.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => openDrawer(challenge)} 
                          className="h-8 w-8 p-0 text-slate-500 hover:text-brand-700 hover:bg-brand-50"
                          title="Edit Challenge"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleClone(challenge)} 
                          className="h-8 w-8 p-0 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
                          title="Clone Challenge"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            Showing <span className="text-slate-900">{Math.min(total, (page-1)*20+1)}</span> to <span className="text-slate-900">{Math.min(total, page*20)}</span> of <span className="text-slate-900">{total}</span> Challenges
          </p>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              disabled={page === 1} 
              onClick={() => setPage(p => p - 1)}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              disabled={page * 20 >= total} 
              onClick={() => setPage(p => p + 1)}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Side Drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
              className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed inset-y-0 right-0 z-[101] w-full max-w-2xl bg-white shadow-2xl flex flex-col"
            >
              <header className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h2 className="text-xl font-black text-slate-900 pr-12">{editingChallenge?.id ? 'Edit Challenge' : 'New Challenge'}</h2>
                  <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Configure mission parameters and content</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setDrawerOpen(false)} className="h-10 w-10 p-0 rounded-xl">
                  <X className="h-5 w-5" />
                </Button>
              </header>

              <div className="flex-1 overflow-y-auto p-8 space-y-8">
                <div className="grid grid-cols-2 gap-6">
                  <div className="col-span-2 space-y-2">
                    <label className="text-xs font-black uppercase text-slate-400 tracking-widest">Title</label>
                    <Input 
                      placeholder="e.g. The Phishing Lure" 
                      value={editingChallenge?.title}
                      onChange={(e) => setEditingChallenge(prev => ({ ...prev!, title: e.target.value }))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase text-slate-400 tracking-widest">Category</label>
                    <select 
                      title="Select Category"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 h-11 text-sm font-bold focus:ring-2 focus:ring-brand-700/20 outline-none"
                      value={editingChallenge?.category}
                      onChange={(e) => setEditingChallenge(prev => ({ ...prev!, category: e.target.value }))}
                    >
                      {CATEGORIES.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase text-slate-400 tracking-widest">Type</label>
                    <select 
                      title="Select Type"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 h-11 text-sm font-bold focus:ring-2 focus:ring-brand-700/20 outline-none"
                      value={editingChallenge?.type}
                      onChange={(e) => handleTypeChange(e.target.value)}
                    >
                      {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase text-slate-400 tracking-widest">Difficulty</label>
                    <select 
                      title="Select Difficulty"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 h-11 text-sm font-bold focus:ring-2 focus:ring-brand-700/20 outline-none"
                      value={editingChallenge?.difficulty}
                      onChange={(e) => setEditingChallenge(prev => ({ ...prev!, difficulty: e.target.value }))}
                    >
                      {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase text-slate-400 tracking-widest">Points</label>
                    <Input 
                      type="number"
                      min={10} max={1000} step={10}
                      value={editingChallenge?.points}
                      onChange={(e) => setEditingChallenge(prev => ({ ...prev!, points: parseInt(e.target.value) }))}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black uppercase text-slate-400 tracking-widest">Content JSON</label>
                    <Badge variant="outline" className="text-[10px] font-black">{editingChallenge?.type?.toUpperCase()} SCHEMA</Badge>
                  </div>
                  
                  <div className="border-2 border-slate-100 rounded-2xl overflow-hidden shadow-inner">
                    <Editor
                      height="400px"
                      defaultLanguage="json"
                      value={jsonContent}
                      onChange={(val) => setJsonContent(val || "")}
                      theme="vs-light"
                      options={{
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        fontSize: 13,
                        fontWeight: "600",
                        padding: { top: 20, bottom: 20 },
                        lineNumbersMinChars: 3,
                        roundedSelection: true
                      }}
                    />
                  </div>
                  {jsonError && (
                    <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-700 animate-in fade-in slide-in-from-top-2">
                      <AlertCircle className="h-5 w-5 mt-0.5" />
                      <div>
                        <p className="text-xs font-black uppercase">Validation Error</p>
                        <p className="text-sm font-medium">{jsonError}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <footer className="p-8 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-4">
                <Button variant="ghost" onClick={() => setDrawerOpen(false)} disabled={saving}>Cancel</Button>
                <Button onClick={saveChallenge} disabled={saving} className="min-w-[140px] shadow-lg shadow-brand-700/20">
                  {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : editingChallenge?.id ? 'Update Challenge' : 'Create Challenge'}
                </Button>
              </footer>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
