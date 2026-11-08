"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Activity, Home, Tv } from "lucide-react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorBoundary({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log error to console for diagnostics
    console.error("Unhandled client error in route segment:", error);
  }, [error]);

  const isNetworkOrBackendError =
    error?.message?.toLowerCase().includes("fetch") ||
    error?.message?.toLowerCase().includes("network") ||
    error?.message?.toLowerCase().includes("500") ||
    error?.message?.toLowerCase().includes("502") ||
    error?.message?.toLowerCase().includes("503") ||
    error?.message?.toLowerCase().includes("econnrefused") ||
    error?.message?.toLowerCase().includes("aborted");

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center space-y-6 bg-card/60 border border-border/80 backdrop-blur-md p-8 rounded-3xl shadow-lg">
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto shadow-inner">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            {isNetworkOrBackendError
              ? "Backend Service Unavailable"
              : "Something went wrong"}
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {isNetworkOrBackendError
              ? "We couldn't connect to the BuzzClips API servers. This may be due to temporary network maintenance or high traffic."
              : error?.message || "An unexpected error occurred while processing this request."}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button
            onClick={() => reset()}
            className="w-full sm:w-auto gap-2 font-medium"
            id="error-boundary-retry-btn"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </Button>

          <Button
            variant="outline"
            asChild
            className="w-full sm:w-auto gap-2"
          >
            <Link href="/status">
              <Activity className="w-4 h-4 text-emerald-500" />
              Check Status
            </Link>
          </Button>
        </div>

        <div className="pt-4 border-t border-border/50 flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <Link
            href="/"
            className="hover:text-foreground flex items-center gap-1 transition-colors"
          >
            <Home className="w-3.5 h-3.5" /> Home
          </Link>
          <span>•</span>
          <Link
            href="/tv"
            className="hover:text-foreground flex items-center gap-1 transition-colors"
          >
            <Tv className="w-3.5 h-3.5" /> Live TV
          </Link>
          <span>•</span>
          <Link
            href="/status"
            className="hover:text-foreground flex items-center gap-1 transition-colors"
          >
            <Activity className="w-3.5 h-3.5" /> System Status
          </Link>
        </div>
      </div>
    </div>
  );
}
