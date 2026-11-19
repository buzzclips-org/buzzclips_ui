"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import type { EditorPreset } from "./VideoEditor";

const VideoEditor = dynamic(() => import("./VideoEditor"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[70vh] w-full items-center justify-center gap-3 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin" />
      <span className="text-sm font-medium">Loading video editor…</span>
    </div>
  ),
});

export default function EditorLoader({ preset }: { preset?: EditorPreset }) {
  return <VideoEditor preset={preset} />;
}
