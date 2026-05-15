"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { getAuditLogs } from "@/lib/api";

interface AuditEntry {
  id: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  details: Record<string, any> | null;
  created_at: string;
}

const actionIcons: Record<string, string> = {
  CREATE: "text-green-600",
  UPDATE: "text-blue-600",
  UPLOAD_IMAGE: "text-cyan-600",
  ATTACH_IMAGE: "text-purple-600",
  GENERATE_REPORT: "text-orange-600",
};

export default function AuditPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    setReady(true);
    loadLogs();
  }, [router]);

  async function loadLogs(resourceType?: string) {
    setLoading(true);
    try {
      const res = await getAuditLogs(resourceType || undefined);
      setLogs(res.data.logs || []);
    } catch {} finally { setLoading(false); }
  }

  if (!ready) return null;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-5xl mx-auto space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Audit Trail</h2>
            <p className="text-gray-500 mt-1">Track all AI actions, case updates, and system events</p>
          </div>

          <div className="flex gap-2">
            {["", "case", "report", "image"].map(f => (
              <button key={f} onClick={() => { setFilter(f); loadLogs(f); }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filter === f ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}>
                {f === "" ? "All" : f.charAt(0).toUpperCase() + f.slice(1) + "s"}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="text-center text-gray-400 py-12">Loading audit logs...</div>
          ) : logs.length === 0 ? (
            <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-100 text-center">
              <p className="text-gray-400">No audit logs found</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-5 py-3 font-medium text-gray-600">Timestamp</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-600">Action</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-600">Resource</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-600">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {logs.map(log => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3 text-gray-500 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`font-medium ${actionIcons[log.action] || "text-gray-700"}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-700">
                        <span className="capitalize">{log.resource_type}</span>
                        {log.resource_id && (
                          <span className="text-gray-400 ml-1 text-xs font-mono">
                            {log.resource_id.slice(0, 8)}...
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-gray-500 text-xs font-mono max-w-xs truncate">
                        {log.details ? JSON.stringify(log.details) : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
