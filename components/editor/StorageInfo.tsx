"use client";

import { useCallback, useEffect, useState } from "react";
import { HardDrive, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatBytes } from "@/lib/editor/timeline";
import { Button } from "@/components/ui/button";
import { PanelSection } from "./controls";
import { estimateStorage, opfsSupported, type StorageEstimate } from "./engine/opfs";
import { loadPendingExport, pruneExports, pruneMedia } from "./engine/storage";

/** Shows how much browser disk the editor uses and lets the user clean up leftovers. */
export function StorageInfo({ keepAssetIds }: { keepAssetIds: string[] }) {
  const [estimate, setEstimate] = useState<StorageEstimate | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(() => {
    estimateStorage().then(setEstimate);
  }, []);
  useEffect(refresh, [refresh]);

  const clean = async () => {
    setBusy(true);
    const before = (await estimateStorage())?.usage ?? 0;
    const pending = await loadPendingExport();
    await Promise.all([pruneMedia(new Set(keepAssetIds)), pruneExports([pending?.opfsName])]);
    const after = await estimateStorage();
    setEstimate(after);
    setBusy(false);
    const freed = Math.max(0, before - (after?.usage ?? before));
    toast.success(freed > 0 ? `Freed ${formatBytes(freed)}` : "Nothing to clean up. Only files in your project are stored.");
  };

  const pct = estimate ? Math.min(100, (estimate.usage / estimate.quota) * 100) : 0;

  return (
    <PanelSection title="Storage">
      <div className="space-y-2 rounded-lg border border-border/60 bg-muted/30 p-2.5">
        <div className="flex items-center gap-2 text-xs">
          <HardDrive className="h-3.5 w-3.5 text-muted-foreground" />
          {estimate ? (
            <span>
              {formatBytes(estimate.usage)} used of {formatBytes(estimate.quota)} available
            </span>
          ) : (
            <span className="text-muted-foreground">Storage info unavailable in this browser</span>
          )}
        </div>
        {estimate && (
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className={pct > 85 ? "h-full bg-red-500" : "h-full bg-primary"} style={{ width: `${Math.max(1, pct)}%` }} />
          </div>
        )}
        <p className="text-[10px] leading-relaxed text-muted-foreground">
          {opfsSupported()
            ? "Media and exports are kept on disk (not in memory) so long projects stay smooth."
            : "Media is kept in browser storage so your project survives a reload."}
        </p>
        <Button variant="outline" size="sm" className="h-7 w-full gap-1.5 text-[11px]" onClick={clean} disabled={busy}>
          {busy && <Loader2 className="h-3 w-3 animate-spin" />}
          Free up space (remove unused files)
        </Button>
      </div>
    </PanelSection>
  );
}
