"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Props {
  imageId: string;
  filename?: string;
  modality?: string | null;
}

export default function DicomViewer({ imageId, filename, modality }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Viewer state
  const [zoom, setZoom] = useState(1);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [inverted, setInverted] = useState(false);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  // Fetch the image file
  useEffect(() => {
    async function fetchImage() {
      const token = localStorage.getItem("token");
      try {
        const res = await fetch(`${API_URL}/images/${imageId}/file`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to load image");
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        setImageSrc(url);
      } catch (err: any) {
        setError(err.message || "Failed to load image");
      } finally {
        setLoading(false);
      }
    }
    fetchImage();
    return () => {
      if (imageSrc) URL.revokeObjectURL(imageSrc);
    };
  }, [imageId]);

  // Render image to canvas with adjustments
  const renderCanvas = useCallback(() => {
    if (!imageSrc || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      canvas.width = canvas.parentElement?.clientWidth || 600;
      canvas.height = canvas.parentElement?.clientHeight || 500;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Apply filters
      ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) ${inverted ? "invert(1)" : ""}`;

      // Calculate centered + zoomed + panned position
      const scale = Math.min(canvas.width / img.width, canvas.height / img.height) * zoom;
      const drawW = img.width * scale;
      const drawH = img.height * scale;
      const x = (canvas.width - drawW) / 2 + panOffset.x;
      const y = (canvas.height - drawH) / 2 + panOffset.y;

      ctx.drawImage(img, x, y, drawW, drawH);
      ctx.filter = "none";

      // Draw zoom indicator
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(8, canvas.height - 30, 90, 22);
      ctx.fillStyle = "#fff";
      ctx.font = "12px monospace";
      ctx.fillText(`Zoom: ${(zoom * 100).toFixed(0)}%`, 14, canvas.height - 14);
    };
    img.src = imageSrc;
  }, [imageSrc, zoom, brightness, contrast, inverted, panOffset]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Mouse handlers for pan
  const handleMouseDown = (e: React.MouseEvent) => {
    isPanning.current = true;
    lastMouse.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning.current) return;
    const dx = e.clientX - lastMouse.current.x;
    const dy = e.clientY - lastMouse.current.y;
    lastMouse.current = { x: e.clientX, y: e.clientY };
    setPanOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
  };

  const handleMouseUp = () => {
    isPanning.current = false;
  };

  // Scroll to zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom((prev) => Math.max(0.2, Math.min(5, prev + delta)));
  };

  const resetView = () => {
    setZoom(1);
    setBrightness(100);
    setContrast(100);
    setInverted(false);
    setPanOffset({ x: 0, y: 0 });
  };

  if (loading) {
    return (
      <div className="bg-black rounded-xl p-12 text-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-gray-400">Loading medical image...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-900 rounded-xl p-8 text-center">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-xl overflow-hidden border border-gray-700">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 font-mono">
            {filename || "Medical Image"}
            {modality && <span className="ml-2 px-1.5 py-0.5 bg-blue-900 text-blue-300 rounded text-xs">{modality}</span>}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setZoom((z) => Math.min(5, z + 0.25))} className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded" title="Zoom In">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
          </button>
          <button onClick={() => setZoom((z) => Math.max(0.2, z - 0.25))} className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded" title="Zoom Out">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" /></svg>
          </button>
          <div className="w-px h-5 bg-gray-600 mx-1" />
          <button onClick={() => setInverted((v) => !v)} className={`p-1.5 rounded ${inverted ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white hover:bg-gray-700"}`} title="Invert">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
          </button>
          <div className="w-px h-5 bg-gray-600 mx-1" />
          <button onClick={resetView} className="px-2 py-1 text-xs text-gray-400 hover:text-white hover:bg-gray-700 rounded" title="Reset">
            Reset
          </button>
        </div>
      </div>

      {/* Adjustment sliders */}
      <div className="flex items-center gap-4 px-4 py-2 bg-gray-800 border-b border-gray-700 text-xs text-gray-400">
        <label className="flex items-center gap-2">
          <span className="w-16">Brightness</span>
          <input type="range" min={0} max={300} value={brightness} onChange={(e) => setBrightness(Number(e.target.value))}
            className="w-24 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500" />
          <span className="w-8 text-right">{brightness}%</span>
        </label>
        <label className="flex items-center gap-2">
          <span className="w-12">Contrast</span>
          <input type="range" min={0} max={300} value={contrast} onChange={(e) => setContrast(Number(e.target.value))}
            className="w-24 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500" />
          <span className="w-8 text-right">{contrast}%</span>
        </label>
      </div>

      {/* Canvas viewport */}
      <div
        ref={containerRef}
        className="relative h-[500px] cursor-grab active:cursor-grabbing select-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <canvas ref={canvasRef} className="w-full h-full" />
      </div>
    </div>
  );
}
