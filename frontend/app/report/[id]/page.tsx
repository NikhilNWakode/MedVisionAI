"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import ReportCard from "@/components/ReportCard";
import DicomViewer from "@/components/DicomViewer";
import { getReport, getImage } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function ReportPage() {
  const router = useRouter();
  const params = useParams();
  const [report, setReport] = useState<any>(null);
  const [imageInfo, setImageInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showViewer, setShowViewer] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    async function load() {
      try {
        const res = await getReport(params.id as string);
        setReport(res.data);
        // Also load image info
        try {
          const imgRes = await getImage(res.data.image_id);
          setImageInfo(imgRes.data);
        } catch {}
      } catch (err: any) {
        setError(err.response?.data?.detail || "Failed to load report");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.id, router]);

  async function handleDownloadPDF() {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API_URL}/reports/${params.id}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to download");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `report_${params.id}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      alert("PDF download failed");
    }
  }

  async function handleDownloadFHIR() {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API_URL}/reports/${params.id}/fhir`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to download");
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fhir_report_${params.id}.json`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      alert("FHIR export failed");
    }
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Radiology Report</h2>
              <p className="text-gray-500 mt-1">AI-generated structured report with citations</p>
            </div>
            {report && (
              <div className="flex gap-3">
                <button
                  onClick={handleDownloadPDF}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  PDF
                </button>
                <button
                  onClick={handleDownloadFHIR}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  FHIR
                </button>
                <button
                  onClick={() => setShowViewer((v) => !v)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                    showViewer ? "bg-purple-600 text-white hover:bg-purple-700" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Viewer
                </button>
                <button
                  onClick={() => router.push("/dashboard")}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                >
                  Back
                </button>
              </div>
            )}
          </div>

          {loading && (
            <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-100 text-center">
              <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-gray-500">Loading report...</p>
            </div>
          )}
          {error && (
            <div className="p-4 bg-red-50 text-red-700 rounded-lg">{error}</div>
          )}

          {report && (
            <div className={showViewer && imageInfo ? "grid grid-cols-1 xl:grid-cols-2 gap-6" : ""}>
              {/* Image Viewer */}
              {showViewer && imageInfo && (
                <div>
                  <DicomViewer
                    imageId={imageInfo.id}
                    filename={imageInfo.filename}
                    modality={imageInfo.modality}
                  />
                </div>
              )}

              {/* Report */}
              <div>
                <ReportCard report={report} />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
