import { AlertCircle } from "lucide-react";
import { usePageMeta } from "@/hooks/usePageMeta";
import SiteHeader from "@/components/SiteHeader";

export default function NotFound() {
  usePageMeta({
    title: "Page Not Found",
    description: "The page you are looking for does not exist. Browse CryptoKiller's crypto scam investigations or report a scam.",
    robots: "noindex, follow",
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans">
      <SiteHeader activeNav="" />
      <div className="flex items-center justify-center py-32">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-white mb-2">404 — Page Not Found</h1>
          <p className="text-slate-400 mb-6">The page you're looking for doesn't exist.</p>
          <a
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
          >
            Back to Home
          </a>
        </div>
      </div>
    </div>
  );
}
