"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import { getCases, createCase } from "@/lib/api";

interface PatientCase {
  id: string;
  patient_id: string;
  patient_name: string | null;
  age: number | null;
  sex: string | null;
  priority: string;
  status: string;
  image_count: number;
  report_count: number;
  created_at: string;
  updated_at: string;
}

const priorityColors: Record<string, string> = {
  routine: "bg-gray-100 text-gray-700",
  urgent: "bg-orange-100 text-orange-700",
  stat: "bg-red-100 text-red-700",
};

const statusColors: Record<string, string> = {
  open: "bg-blue-100 text-blue-700",
  in_progress: "bg-yellow-100 text-yellow-700",
  reported: "bg-green-100 text-green-700",
  closed: "bg-gray-100 text-gray-500",
};

export default function CasesPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [cases, setCases] = useState<PatientCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ patient_id: "", patient_name: "", age: "", sex: "", clinical_history: "", priority: "routine" });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    setReady(true);
    loadCases();
  }, [router]);

  async function loadCases() {
    try {
      const res = await getCases();
      setCases(res.data.cases || []);
    } catch {} finally { setLoading(false); }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      await createCase({
        patient_id: form.patient_id,
        patient_name: form.patient_name || undefined,
        age: form.age ? parseInt(form.age) : undefined,
        sex: form.sex || undefined,
        clinical_history: form.clinical_history || undefined,
        priority: form.priority,
      });
      setShowCreate(false);
      setForm({ patient_id: "", patient_name: "", age: "", sex: "", clinical_history: "", priority: "routine" });
      loadCases();
    } catch {} finally { setCreating(false); }
  }

  if (!ready) return null;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Patient Cases</h2>
              <p className="text-gray-500 mt-1">Manage patient cases, attach scans, and track reports</p>
            </div>
            <button
              onClick={() => setShowCreate(!showCreate)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              + New Case
            </button>
          </div>

          {showCreate && (
            <form onSubmit={handleCreate} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Create Patient Case</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Patient ID *</label>
                  <input required value={form.patient_id} onChange={e => setForm({...form, patient_id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="PAT-001" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Patient Name</label>
                  <input value={form.patient_name} onChange={e => setForm({...form, patient_name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="John Doe" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
                  <input type="number" value={form.age} onChange={e => setForm({...form, age: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="45" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sex</label>
                  <select value={form.sex} onChange={e => setForm({...form, sex: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="">Select</option>
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                    <option value="O">Other</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Clinical History</label>
                <textarea value={form.clinical_history} onChange={e => setForm({...form, clinical_history: e.target.value})}
                  rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Relevant clinical history..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <div className="flex gap-3">
                  {["routine", "urgent", "stat"].map(p => (
                    <label key={p} className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="priority" value={p} checked={form.priority === p}
                        onChange={e => setForm({...form, priority: e.target.value})} className="text-blue-600" />
                      <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${priorityColors[p]}`}>{p}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={creating}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors">
                  {creating ? "Creating..." : "Create Case"}
                </button>
                <button type="button" onClick={() => setShowCreate(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          )}

          {loading ? (
            <div className="text-center text-gray-400 py-12">Loading cases...</div>
          ) : cases.length === 0 ? (
            <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-100 text-center">
              <p className="text-gray-400 text-lg mb-2">No patient cases yet</p>
              <p className="text-gray-400 text-sm">Create a case to organize images and reports by patient</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {cases.map(c => (
                <Link key={c.id} href={`/cases/${c.id}`}
                  className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:border-blue-200 hover:shadow-md transition-all flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900">{c.patient_name || c.patient_id}</h3>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${priorityColors[c.priority]}`}>{c.priority}</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[c.status]}`}>{c.status.replace("_", " ")}</span>
                      </div>
                      <p className="text-sm text-gray-500">
                        ID: {c.patient_id} {c.age && `| Age: ${c.age}`} {c.sex && `| Sex: ${c.sex}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-sm text-gray-500">
                    <div className="text-center">
                      <p className="text-lg font-bold text-gray-700">{c.image_count}</p>
                      <p className="text-xs">Scans</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-gray-700">{c.report_count}</p>
                      <p className="text-xs">Reports</p>
                    </div>
                    <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
