"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import { getCase, updateCase, getImages, attachImageToCase, getReports } from "@/lib/api";

interface CaseDetail {
  id: string;
  patient_id: string;
  patient_name: string | null;
  age: number | null;
  sex: string | null;
  clinical_history: string | null;
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

export default function CaseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const caseId = params.id as string;

  const [ready, setReady] = useState(false);
  const [caseData, setCaseData] = useState<CaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ status: "", priority: "", clinical_history: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    setReady(true);
    loadCase();
  }, [router, caseId]);

  async function loadCase() {
    try {
      const res = await getCase(caseId);
      setCaseData(res.data);
      setEditForm({
        status: res.data.status,
        priority: res.data.priority,
        clinical_history: res.data.clinical_history || "",
      });
    } catch {
      setCaseData(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      await updateCase(caseId, {
        status: editForm.status,
        priority: editForm.priority,
        clinical_history: editForm.clinical_history || undefined,
      });
      setEditing(false);
      loadCase();
    } catch {} finally {
      setSaving(false);
    }
  }

  if (!ready) return null;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-4xl mx-auto space-y-6">
          <Link href="/cases" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Cases
          </Link>

          {loading ? (
            <div className="text-center text-gray-400 py-12">Loading case...</div>
          ) : !caseData ? (
            <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-100 text-center">
              <p className="text-gray-400 text-lg">Case not found</p>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      {caseData.patient_name || caseData.patient_id}
                    </h2>
                    <p className="text-gray-500 mt-1">Patient ID: {caseData.patient_id}</p>
                  </div>
                  <button
                    onClick={() => setEditing(!editing)}
                    className="px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    {editing ? "Cancel" : "Edit"}
                  </button>
                </div>

                {editing ? (
                  <div className="space-y-4 border-t pt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <select value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                          <option value="open">Open</option>
                          <option value="in_progress">In Progress</option>
                          <option value="reported">Reported</option>
                          <option value="closed">Closed</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                        <select value={editForm.priority} onChange={e => setEditForm({ ...editForm, priority: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                          <option value="routine">Routine</option>
                          <option value="urgent">Urgent</option>
                          <option value="stat">STAT</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Clinical History</label>
                      <textarea value={editForm.clinical_history} onChange={e => setEditForm({ ...editForm, clinical_history: e.target.value })}
                        rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                    <button onClick={handleSave} disabled={saving}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors">
                      {saving ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border-t pt-4">
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wide">Status</p>
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${statusColors[caseData.status]}`}>
                        {caseData.status.replace("_", " ")}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wide">Priority</p>
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${priorityColors[caseData.priority]}`}>
                        {caseData.priority}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wide">Age</p>
                      <p className="mt-1 text-sm font-medium text-gray-900">{caseData.age ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wide">Sex</p>
                      <p className="mt-1 text-sm font-medium text-gray-900">{caseData.sex ?? "—"}</p>
                    </div>
                    {caseData.clinical_history && (
                      <div className="col-span-full">
                        <p className="text-xs text-gray-400 uppercase tracking-wide">Clinical History</p>
                        <p className="mt-1 text-sm text-gray-700">{caseData.clinical_history}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 text-center">
                  <p className="text-3xl font-bold text-blue-600">{caseData.image_count}</p>
                  <p className="text-sm text-gray-500 mt-1">Attached Scans</p>
                  <Link href="/upload" className="text-xs text-blue-600 hover:underline mt-2 inline-block">
                    Upload New Scan →
                  </Link>
                </div>
                <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 text-center">
                  <p className="text-3xl font-bold text-green-600">{caseData.report_count}</p>
                  <p className="text-sm text-gray-500 mt-1">Reports</p>
                </div>
              </div>

              <div className="text-xs text-gray-400">
                Created: {new Date(caseData.created_at).toLocaleString()} · Updated: {new Date(caseData.updated_at).toLocaleString()}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
