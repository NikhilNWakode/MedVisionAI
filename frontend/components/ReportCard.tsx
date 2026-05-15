"use client";

interface ReportData {
  id: string;
  findings: string | null;
  impression: string | null;
  recommendations: string | null;
  confidence: number | null;
  citations: any;
  model_used: string | null;
  created_at: string;
}

interface Props {
  report: ReportData;
}

export default function ReportCard({ report }: Props) {
  const sections = [
    { label: "Findings", content: report.findings },
    { label: "Impression", content: report.impression },
    { label: "Recommendations", content: report.recommendations },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Radiology Report</h3>
          <p className="text-sm text-gray-500">
            Generated {new Date(report.created_at).toLocaleString()}
            {report.model_used && ` | Model: ${report.model_used}`}
          </p>
        </div>
        {report.confidence != null && (
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {(report.confidence * 100).toFixed(0)}%
            </div>
            <p className="text-xs text-gray-500">Confidence</p>
          </div>
        )}
      </div>

      <div className="p-6 space-y-6">
        {sections.map(
          (section) =>
            section.content && (
              <div key={section.label}>
                <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-2">
                  {section.label}
                </h4>
                <p className="text-gray-900 whitespace-pre-wrap leading-relaxed">
                  {section.content}
                </p>
              </div>
            )
        )}

        {report.citations && (
          <div>
            <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-2">
              Citations
            </h4>
            <div className="space-y-2">
              {(Array.isArray(report.citations) ? report.citations : []).map(
                (cite: any, i: number) => (
                  <div key={i} className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                    <span className="font-medium">[{i + 1}]</span>{" "}
                    {cite.title || cite.source || cite.content}
                  </div>
                )
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
