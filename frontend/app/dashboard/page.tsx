"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getImages, getReports, getCases } from "@/lib/api";
import { StatSkeleton, CardSkeleton } from "@/components/LoadingSkeleton";

interface ImageItem {
  id: string;
  filename: string;
  modality: string | null;
  embedding_status: string;
  created_at: string;
}

interface ReportItem {
  id: string;
  image_id: string;
  findings: string | null;
  confidence: number | null;
  created_at: string;
}

export default function DashboardPage() {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [caseCount, setCaseCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [imgRes, repRes, caseRes] = await Promise.all([getImages(), getReports(), getCases()]);
        setImages(imgRes.data.images || []);
        setReports(repRes.data.reports || []);
        setCaseCount(caseRes.data.total || 0);
      } catch {
        // will redirect on 401
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Clinical Dashboard</h2>
        <p className="text-gray-500 mt-1">Overview of your medical imaging and reports</p>
      </div>

      {loading ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => <StatSkeleton key={i} />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <CardSkeleton />
            <CardSkeleton />
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <StatCard label="Patient Cases" value={caseCount} color="purple" href="/cases" />
            <StatCard label="Total Scans" value={images.length} color="blue" href="/upload" />
            <StatCard label="Reports Generated" value={reports.length} color="green" />
            <StatCard
              label="Pending Embeddings"
              value={images.filter((i) => i.embedding_status === "pending").length}
              color="amber"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Recent Scans</h3>
                <Link href="/upload" className="text-sm text-blue-600 hover:underline">
                  Upload New
                </Link>
              </div>
              {images.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="w-10 h-10 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-gray-400 text-sm">No scans uploaded yet</p>
                  <Link href="/upload" className="text-sm text-blue-600 hover:underline mt-1 inline-block">Upload your first scan</Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {images.slice(0, 5).map((img) => (
                    <div key={img.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{img.filename}</p>
                        <p className="text-xs text-gray-500">{img.modality || "Unknown modality"} | {new Date(img.created_at).toLocaleDateString()}</p>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                        img.embedding_status === "completed"
                          ? "bg-green-100 text-green-700"
                          : "bg-amber-100 text-amber-700"
                      }`}>
                        {img.embedding_status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Recent Reports</h3>
              </div>
              {reports.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="w-10 h-10 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-gray-400 text-sm">No reports generated yet</p>
                  <p className="text-gray-400 text-xs mt-1">Upload a scan and generate an AI report</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {reports.slice(0, 5).map((rep) => (
                    <Link
                      key={rep.id}
                      href={`/report/${rep.id}`}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors block"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {rep.findings?.slice(0, 60) || "Report"}...
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(rep.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      {rep.confidence != null && (
                        <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                          {(rep.confidence * 100).toFixed(0)}%
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, color, href }: { label: string; value: number; color: string; href?: string }) {
  const colorMap: Record<string, { bg: string; text: string }> = {
    blue: { bg: "bg-blue-50", text: "text-blue-700" },
    green: { bg: "bg-green-50", text: "text-green-700" },
    amber: { bg: "bg-amber-50", text: "text-amber-700" },
    purple: { bg: "bg-purple-50", text: "text-purple-700" },
  };

  const card = (
    <div className={`bg-white rounded-xl p-6 shadow-sm border border-gray-100 ${href ? "hover:border-blue-200 hover:shadow-md transition-all cursor-pointer" : ""}`}>
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-3xl font-bold mt-2 ${colorMap[color]?.text || "text-gray-900"}`}>{value}</p>
    </div>
  );

  return href ? <Link href={href}>{card}</Link> : card;
}
