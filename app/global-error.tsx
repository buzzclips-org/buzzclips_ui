"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home, Activity } from "lucide-react";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error("Global critical application error:", error);
  }, [error]);

  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-4 font-sans antialiased">
        <div className="max-w-md w-full text-center space-y-6 bg-zinc-900/80 border border-zinc-800 p-8 rounded-3xl shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 text-red-400 flex items-center justify-center mx-auto border border-red-500/20">
            <AlertTriangle className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-zinc-100">
              System Service Disruption
            </h1>
            <p className="text-sm text-zinc-400 leading-relaxed">
              BuzzClips encountered an unexpected critical issue. Our engineering team has been notified.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={() => reset()}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-red-600 text-white font-medium hover:bg-red-700 transition-colors text-sm shadow-md"
            >
              <RefreshCw className="w-4 h-4" />
              Reload Page
            </button>

            <a
              href="/status"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 transition-colors text-sm"
            >
              <Activity className="w-4 h-4 text-emerald-400" />
              Live Status
            </a>
          </div>

          <div className="pt-4 border-t border-zinc-800 flex items-center justify-center gap-4 text-xs text-zinc-500">
            <a href="/" className="hover:text-zinc-300 flex items-center gap-1">
              <Home className="w-3.5 h-3.5" /> Back Home
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
