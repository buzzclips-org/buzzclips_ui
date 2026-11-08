"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { MESSAGES } from "@/constants/messages";
import { deleteVideo } from "@/utility/requests";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { useAuth } from "@/store/auth-context";
import { useQueryClient } from "@tanstack/react-query";
import { Trash2, Loader2, AlertTriangle, Film } from "lucide-react";

export interface DeleteVideoButtonProps {
  videoId: number;
  videoTitle?: string;
}

export default function DeleteVideoButton({
  videoId,
  videoTitle,
}: DeleteVideoButtonProps) {
  const { user, token } = useAuth();
  const queryClient = useQueryClient();
  const [isDeleting, setIsDeleting] = useState(false);
  const [open, setOpen] = useState(false);
  const [confirmInput, setConfirmInput] = useState("");
  const [isConfirmedByCheckbox, setIsConfirmedByCheckbox] = useState(false);

  const normalizedInput = confirmInput.trim().toLowerCase();
  const isWordMatch = normalizedInput === "delete";
  const isTitleMatch =
    Boolean(videoTitle) &&
    normalizedInput === videoTitle?.trim().toLowerCase();
  const isConfirmed =
    !videoTitle || isConfirmedByCheckbox || isWordMatch || isTitleMatch;
  const canDelete = isConfirmed && !isDeleting;

  const handleDelete = async () => {
    if (!user?.userId) {
      toast.error(MESSAGES.DELETED_ERROR);
      return;
    }

    if (!canDelete) return;

    setIsDeleting(true);
    try {
      await deleteVideo(user.userId, videoId, token as string);
      toast.success(MESSAGES.DELETED_SUCCESS);
      // Invalidate userVideos query so the table immediately updates
      queryClient.invalidateQueries({ queryKey: ["userVideos"] });
      setOpen(false);
      setConfirmInput("");
      setIsConfirmedByCheckbox(false);
    } catch (error) {
      console.error("Delete video failed:", error);
      toast.error(MESSAGES.DELETED_ERROR);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setConfirmInput("");
      setIsConfirmedByCheckbox(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          title="Delete video"
          aria-label="Delete video"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="border border-border/50 bg-card/95 backdrop-blur-md rounded-2xl shadow-2xl max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-2 text-destructive">
            <div className="w-9 h-9 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <AlertDialogTitle className="text-lg font-semibold text-foreground">
              Delete video?
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription asChild>
            <div className="text-muted-foreground text-sm space-y-3 pt-1 text-left">
              <p>
                This action cannot be undone. This video and all its associated
                data will be permanently removed from your channel.
              </p>

              {videoTitle && (
                <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-muted/60 border border-border/50 text-xs text-foreground font-medium">
                  <Film className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="truncate select-all" title={videoTitle}>
                    {videoTitle}
                  </span>
                </div>
              )}

              {videoTitle && (
                <div className="space-y-3 pt-1">
                  {/* Option 1: Quick Checkbox Confirmation */}
                  <label className="flex items-center gap-2.5 cursor-pointer select-none text-xs text-foreground/90 hover:text-foreground transition-colors p-2 rounded-lg bg-muted/30 border border-border/40 hover:bg-muted/50">
                    <input
                      type="checkbox"
                      checked={isConfirmedByCheckbox}
                      onChange={(e) => setIsConfirmedByCheckbox(e.target.checked)}
                      disabled={isDeleting}
                      className="h-4 w-4 rounded border-border/80 text-destructive focus:ring-destructive accent-destructive cursor-pointer"
                    />
                    <span className="font-medium">
                      I understand this video will be permanently deleted
                    </span>
                  </label>

                  {/* Option 2: Simple Type "delete" */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <label
                        htmlFor={`delete-confirm-${videoId}`}
                        className="font-medium text-foreground"
                      >
                        Or type <span className="font-bold text-destructive">delete</span> to confirm:
                      </label>
                      <button
                        type="button"
                        onClick={() => setConfirmInput("delete")}
                        disabled={isDeleting}
                        className="text-[11px] font-medium text-destructive hover:underline transition-colors cursor-pointer"
                      >
                        Auto-fill &quot;delete&quot;
                      </button>
                    </div>
                    <Input
                      id={`delete-confirm-${videoId}`}
                      value={confirmInput}
                      onChange={(e) => setConfirmInput(e.target.value)}
                      placeholder='Type "delete" to confirm'
                      className="h-9 text-sm border-border/60 focus-visible:ring-destructive"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && canDelete) {
                          e.preventDefault();
                          handleDelete();
                        }
                      }}
                      disabled={isDeleting}
                    />
                  </div>
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-0 pt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="order-2 sm:order-1">
            {!isConfirmed && (
              <p className="text-[11px] text-muted-foreground/75">
                Check box or type &quot;delete&quot; to enable
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 justify-end order-1 sm:order-2">
            <AlertDialogCancel
              disabled={isDeleting}
              onClick={() => {
                setConfirmInput("");
                setIsConfirmedByCheckbox(false);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={!canDelete}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {isDeleting ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deleting...
                </span>
              ) : (
                "Delete Video"
              )}
            </AlertDialogAction>
          </div>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
