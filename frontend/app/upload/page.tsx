"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import ImageUploader from "@/components/ImageUploader";
import { generateReport } from "@/lib/api";

interface UploadResult {
  id: string;
  filename: string;
  modality: string | null;
  body_part: string | null;
  dicom_metadata: Record<string, string> | null;
  embedding_status: string;
  thumbnail_path: string | null;
}

export default function UploadPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [clinicalNotes, setClinicalNotes] = useState("");
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
    } else {
      setReady(true);
    }
  }, [router]);

  async function handleGenerateReport() {
    if (!uploadResult) return;
    setGenerating(true);
    setGenError("");
    try {
      const res = await generateReport(uploadResult.id, clinicalNotes || undefined);
      router.push(`/report/${res.data.id}`);
    } catch (err: any) {
      setGenError(err.response?.data?.detail || "Report generation failed");
    } finally {
      setGenerating(false);
    }
  }

  if (!ready) return null;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-3xl mx-auto space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Upload Medical Scan</h2>
            <p className="text-gray-500 mt-1">
              Upload a DICOM file or medical image for AI-assisted analysis
            </p>
          </div>

          <ImageUploader onUploadComplete={(result) => setUploadResult(result)} />

          {uploadResult && (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Generate AI Report</h3>
              <p className="text-sm text-gray-500">
                Generate a structured radiology report for <span className="font-medium text-gray-700">{uploadResult.filename}</span>
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Clinical Notes (optional)
                </label>
                <textarea
                  value={clinicalNotes}
                  onChange={(e) => setClinicalNotes(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                  placeholder="Patient presents with shortness of breath, history of smoking..."
                />
              </div>

              {genError && (
                <div className="p-3 text-sm text-red-700 bg-red-50 rounded-lg">{genError}</div>
              )}

              <button
                onClick={handleGenerateReport}
                disabled={generating}
                className="w-full py-3 px-4 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {generating ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Generating Report...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Generate AI Report
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
