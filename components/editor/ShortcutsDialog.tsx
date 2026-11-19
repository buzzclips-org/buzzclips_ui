"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Kbd } from "./controls";

const SHORTCUTS: [string[], string][] = [
  [["Space"], "Play / pause"],
  [["S"], "Split clip at playhead"],
  [["T"], "Add text at playhead"],
  [["D"], "Duplicate selected clip or text"],
  [["Del"], "Delete selection"],
  [["←", "→"], "Step one frame"],
  [["Shift", "← / →"], "Jump one second"],
  [["J", "L"], "Jump 5 seconds back / forward"],
  [["Home", "End"], "Go to start / end"],
  [["Ctrl/⌘", "Z"], "Undo"],
  [["Ctrl/⌘", "Shift", "Z"], "Redo"],
  [["Ctrl/⌘", "Scroll"], "Zoom timeline"],
  [["Esc"], "Clear selection"],
  [["?"], "Show this help"],
];

export function ShortcutsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts & tips</DialogTitle>
          <DialogDescription>Edit faster without leaving the keyboard.</DialogDescription>
        </DialogHeader>
        <ul className="divide-y divide-border/50 text-sm">
          {SHORTCUTS.map(([keys, label]) => (
            <li key={label} className="flex items-center justify-between py-1.5">
              <span className="text-muted-foreground">{label}</span>
              <span className="flex items-center gap-1">
                {keys.map((k) => (
                  <Kbd key={k}>{k}</Kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>
        <div className="space-y-1 rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
          <p>• Drag clips on the timeline to reorder them; drag their edges to trim.</p>
          <p>• Drag files from your computer anywhere onto the editor, or paste them.</p>
          <p>• Your project autosaves in this browser, so you can close the tab and come back later.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
