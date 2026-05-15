"use client";

import { useCallback, useState } from "react";
import { uploadImage } from "@/lib/api";

interface UploadResult {
  id: string;
  filename: string;
  modality: string | null;
  body_part: string | null;
  dicom_metadata: Record<string, string> | null;
  embedding_status: string;
  thumbnail_path: string | null;
}

interface Props {
  onUploadComplete?: (result: UploadResult) => void;
}

export default function ImageUploader({ onUploadComplete }: Props) {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<UploadResult | null>(null);

  const handleFile = useCallback(async (file: File) => {
    setError("");
    setResult(null);
    setUploading(true);
    try {
      const res = await uploadImage(file);
      setResult(res.data);
      onUploadComplete?.(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Upload failed");
    } finally {
      setUploading(false);
    }
  }, [onUploadComplete]);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  return (
    <div className="space-y-6">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
          dragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 bg-gray-50"
        }`}
      >
        <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
        <p className="text-gray-600 mb-2">
          {uploading ? "Uploading..." : "Drag & drop a medical image here"}
        </p>
        <p className="text-sm text-gray-400 mb-4">DICOM, PNG, JPG supported (max 100MB)</p>
        <label className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 transition-colors">
          Browse Files
          <input type="file" className="hidden" onChange={handleChange} accept=".dcm,.dicom,.png,.jpg,.jpeg" />
        </label>
      </div>

      {error && <div className="p-4 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

      {result && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Successful</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Filename:</span>
              <p className="font-medium">{result.filename}</p>
            </div>
            <div>
              <span className="text-gray-500">Modality:</span>
              <p className="font-medium">{result.modality || "N/A"}</p>
            </div>
            <div>
              <span className="text-gray-500">Body Part:</span>
              <p className="font-medium">{result.body_part || "N/A"}</p>
            </div>
            <div>
              <span className="text-gray-500">Embedding Status:</span>
              <p className="font-medium">{result.embedding_status}</p>
            </div>
          </div>

          {result.dicom_metadata && Object.keys(result.dicom_metadata).length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">DICOM Metadata</h4>
              <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-2 gap-2 text-xs">
                {Object.entries(result.dicom_metadata).map(([key, value]) => (
                  <div key={key}>
                    <span className="text-gray-500">{key}:</span>{" "}
                    <span className="font-medium">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
