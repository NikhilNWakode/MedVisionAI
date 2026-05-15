import type { Metadata } from "next";
import "./globals.css";
import ErrorBoundary from "@/components/ErrorBoundary";

export const metadata: Metadata = {
  title: "MedVision AI - Radiology Copilot",
  description: "Multimodal AI-powered radiology assistant for clinical decision support",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-medical-bg">
        <ErrorBoundary>{children}</ErrorBoundary>
      </body>
    </html>
  );
}
