"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useEffect, useState, useRef } from "react";
import {
  Loader2,
  UploadCloud,
  FileVideo,
  X,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  LogIn,
  Film,
  Tag,
  AlignLeft,
  Globe,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/store/language-context";

import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "../ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { useAuth } from "@/store/auth-context";
import { MESSAGES } from "@/constants/messages";
import {
  VideoCategory,
  VideoVisibility,
  TranscodeProgress,
} from "@/types/video";
import {
  MAX_UPLOAD_SIZE_MB,
  VIDEO_CATEGORIES,
  isNetworkError,
  subscribeTranscodeProgress,
  uploadVideo,
} from "@/utility/videoUpload";
import { clearPendingExport, loadPendingExport } from "@/components/editor/engine/storage";

const MAX_FILE_SIZE_MB = MAX_UPLOAD_SIZE_MB; // 1GB direct S3 upload

const CATEGORIES: VideoCategory[] = VIDEO_CATEGORIES;

const formSchema = z.object({
  videoTitle: z
    .string()
    .min(1, "Title is required")
    .max(100, "Title cannot exceed 100 characters"),
  description: z
    .string()
    .max(2000, "Description cannot exceed 2000 characters")
    .optional(),
  category: z.string().default("OTHER"),
  visibility: z.enum(["PUBLIC", "UNLISTED", "PRIVATE"]).default("PUBLIC"),
  tags: z.string().optional(),
  file: z
    .any()
    .refine(
      (file) => typeof window !== "undefined" && file instanceof File,
      "Video file is required"
    ),
  userId: z.string(),
});


export default function UploadPage() {
  const { user, token } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploaded, setIsUploaded] = useState(false);
  const [createdVideoId, setCreatedVideoId] = useState<number | null>(null);
  const [uploadProcessId, setUploadProcessId] = useState<string | null>(null);
  const [transcodeProgress, setTranscodeProgress] = useState<TranscodeProgress | null>(null);

  // Follow server-side transcoding (SSE with REST polling fallback).
  useEffect(() => {
    if (!createdVideoId && !uploadProcessId) return;
    return subscribeTranscodeProgress({
      videoId: createdVideoId,
      processId: uploadProcessId,
      onUpdate: (progress) => {
        setTranscodeProgress(progress);
        if (progress.status === "COMPLETED") {
          toast.success("Multi-rendition HLS transcoding completed! Video is live 🎬");
        } else if (progress.status === "FAILED") {
          toast.error("Transcoding failed. Please check video format.");
        }
      },
    });
  }, [createdVideoId, uploadProcessId]);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      videoTitle: "",
      description: "",
      category: "OTHER",
      visibility: "PUBLIC" as VideoVisibility,
      tags: "",
      file: null as unknown as File,
      userId: user?.userId || "",
    },
  });

  const { setValue, watch, reset, formState } = form;
  const selectedFile: File | null = watch("file");
  const videoTitle = watch("videoTitle") || "";
  const description = watch("description") || "";

  useEffect(() => {
    if (user?.userId) {
      setValue("userId", user.userId);
    }
  }, [user, setValue]);

  const handleFileSelection = (file: File | null) => {
    if (!file) return;

    if (!file.type.startsWith("video/")) {
      toast.error("Please select a valid video file (MP4, WebM, MOV, etc.)");
      return;
    }

    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > MAX_FILE_SIZE_MB) {
      toast.error(
        `File size (${fileSizeMB.toFixed(1)}MB) exceeds the maximum limit of ${MAX_FILE_SIZE_MB}MB.`
      );
      return;
    }

    setValue("file", file, { shouldValidate: true });

    // Auto-fill title from filename if title is currently empty
    if (!videoTitle.trim()) {
      const cleanName = file.name
        .replace(/\.[^/.]+$/, "")
        .replace(/[-_]/g, " ");
      setValue("videoTitle", cleanName.slice(0, 100), { shouldValidate: true });
    }
  };

  // Hand-off from the in-browser editor ("/" -> Export -> Publish): attach the exported video.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (new URLSearchParams(window.location.search).get("source") !== "editor") return;
    let cancelled = false;
    loadPendingExport().then((pending) => {
      if (cancelled || !pending) return;
      const file = new File([pending.blob], pending.fileName, {
        type: pending.blob.type || "video/mp4",
      });
      handleFileSelection(file);
      if (pending.title?.trim()) {
        setValue("videoTitle", pending.title.trim().slice(0, 100), { shouldValidate: true });
      }
      toast.success("Your edited video is attached. Add the details and publish!");
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRemoveFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setValue("file", null as unknown as File, { shouldValidate: true });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileSelection(files[0]);
    }
  };

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!token) {
      toast.error(MESSAGES.USER_NOT_AUTHENTICATED);
      return;
    }

    setUploadProgress(0);
    setTranscodeProgress(null);

    try {
      const result = await uploadVideo({
        file: values.file,
        meta: values,
        token,
        userId: values.userId,
        onProgress: setUploadProgress,
        onFallback: (error) => {
          console.warn("Direct presigned upload failed, falling back to multipart", error);
          if (isNetworkError(error)) {
            toast.error("Direct S3 upload failed (CORS or network). Falling back to server upload...");
          }
        },
      });
      if (result.processId) setUploadProcessId(result.processId);
      if (result.videoId) setCreatedVideoId(result.videoId);
      toast.success(
        result.via === "direct" ? "Video uploaded directly to S3! Transcoding queued 🚀" : MESSAGES.FILE_UPLOADED
      );
      setIsUploaded(true);
      clearPendingExport();
      if (result.via === "direct") {
        reset({
          videoTitle: "",
          description: "",
          category: "OTHER",
          visibility: "PUBLIC",
          tags: "",
          file: null as unknown as File,
          userId: user?.userId || "",
        });
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    } catch (error) {
      console.error(error);
      toast.error(MESSAGES.FILE_UPLOAD_FAILED);
    } finally {
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  // If user is not authenticated
  if (!user) {
    return (
      <Card className="border border-border/50 shadow-xl dark:shadow-2xl dark:shadow-primary/5 bg-card/85 backdrop-blur-md rounded-2xl text-center p-8 space-y-5">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
          <UploadCloud className="w-7 h-7" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-xl font-bold tracking-tight">Upload Studio</h2>
          <p className="text-sm text-muted-foreground">
            You need to be logged in to upload and share videos on BuzzClips.
          </p>
        </div>
        <Link href="/auth/login" className="block pt-2">
          <Button className="w-full h-11 font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg shadow-blue-500/20">
            <LogIn className="w-4 h-4 mr-2" />
            Sign In to Upload
          </Button>
        </Link>
      </Card>
    );
  }

  // Upload success screen with live SSE transcode tracker
  if (isUploaded) {
    const stage = transcodeProgress?.stage || "QUEUED";
    const percent = transcodeProgress?.percent ?? 15;
    const isCompleted = transcodeProgress?.status === "COMPLETED";

    return (
      <Card className="border border-border/50 shadow-xl dark:shadow-2xl dark:shadow-primary/5 bg-card/85 backdrop-blur-md rounded-2xl overflow-hidden text-center p-8 space-y-6">
        <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 ring-8 ring-emerald-500/5">
          <CheckCircle2 className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">
            Direct S3 Upload Successful!
          </h2>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Your video file was delivered directly to AWS S3 and queued for multi-rendition ABR HLS encoding.
          </p>
        </div>

        {/* Live SSE Transcoding Status */}
        <div className="p-4 rounded-xl bg-muted/40 border border-border/50 max-w-md mx-auto space-y-3 text-left">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-foreground flex items-center gap-1.5">
              {!isCompleted && <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />}
              {isCompleted ? "Transcoding Completed!" : `Stage: ${stage}`}
            </span>
            <span className="font-mono text-primary font-bold">
              {percent}%
            </span>
          </div>

          <div className="w-full bg-muted rounded-full h-2 overflow-hidden ring-1 ring-border/30">
            <div
              className={`h-2 rounded-full transition-all duration-500 ease-out ${
                isCompleted
                  ? "bg-emerald-500"
                  : "bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600"
              }`}
              style={{ width: `${percent}%` }}
            />
          </div>

          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-primary" />
            Generating 1080p, 720p, 480p, 360p adaptive playlists & scrub storyboards.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Button
            variant="outline"
            onClick={() => {
              setIsUploaded(false);
              setCreatedVideoId(null);
              setUploadProcessId(null);
              setTranscodeProgress(null);
            }}
            className="h-10"
          >
            Upload Another Video
          </Button>

          {createdVideoId ? (
            <Link href={`/watch/${createdVideoId}`}>
              <Button className="h-10 font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-md shadow-blue-500/20">
                Watch Video Now
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </Link>
          ) : (
            <Button
              onClick={() => router.push("/my-videos")}
              className="h-10 font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-md shadow-blue-500/20"
            >
              View My Videos
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          )}
        </div>
      </Card>
    );
  }

  return (
    <Card className="border border-border/50 shadow-xl dark:shadow-2xl dark:shadow-primary/5 bg-card/85 backdrop-blur-md rounded-2xl overflow-hidden">
      {/* Decorative gradient top bar */}
      <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />

      <CardHeader className="space-y-1.5 pb-4">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 w-fit mb-1">
          <Sparkles className="w-3 h-3" />
          Upload Studio
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight">
          Upload a Video
        </CardTitle>
        <CardDescription className="text-muted-foreground text-sm">
          Publish your video to BuzzClips. Automatic HLS encoding will generate adaptive streams.
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-2">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6"
          >
            {/* Drag and Drop Zone */}
            <FormField
              control={form.control}
              name="file"
              render={() => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Video File
                  </FormLabel>
                  <FormControl>
                    <div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="video/*"
                        className="hidden"
                        onChange={(e) =>
                          handleFileSelection(e.target.files?.[0] || null)
                        }
                        disabled={formState.isSubmitting}
                      />

                      {!selectedFile ? (
                        <div
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={handleDrop}
                          onClick={() => fileInputRef.current?.click()}
                          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
                            isDragging
                              ? "border-primary bg-primary/10 scale-[1.01]"
                              : "border-border/70 hover:border-primary/50 bg-muted/20 hover:bg-muted/40"
                          }`}
                        >
                          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
                            <UploadCloud className="w-6 h-6" />
                          </div>
                          <p className="text-sm font-semibold text-foreground">
                            Click to upload or drag and drop
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            MP4, WebM, MOV, or MKV up to {MAX_FILE_SIZE_MB}MB
                          </p>
                          <div className="flex items-center justify-center gap-2 mt-4">
                            <Badge
                              variant="outline"
                              className="text-[11px] font-medium bg-background/50"
                            >
                              Up to {MAX_FILE_SIZE_MB}MB
                            </Badge>
                            <Badge
                              variant="outline"
                              className="text-[11px] font-medium bg-background/50"
                            >
                              Auto Transcoding
                            </Badge>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between p-4 rounded-xl border border-border/60 bg-muted/30">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                              <FileVideo className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold truncate text-foreground">
                                {selectedFile.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {(
                                  selectedFile.size /
                                  (1024 * 1024)
                                ).toFixed(2)}{" "}
                                MB • Ready to upload
                              </p>
                            </div>
                          </div>

                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={handleRemoveFile}
                            disabled={formState.isSubmitting}
                            className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                            title="Remove file"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Video Title Input */}
            <FormField
              control={form.control}
              name="videoTitle"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {t("upload.videoTitle")}
                    </FormLabel>
                    <span className="text-[11px] text-muted-foreground">
                      {videoTitle.length}/100
                    </span>
                  </div>
                  <FormControl>
                    <div className="relative">
                      <Film className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                      <Input
                        placeholder={t("upload.titlePlaceholder")}
                        className="pl-10 h-11 bg-muted/30 border-muted-foreground/15 rounded-lg text-sm focus-visible:border-primary/50"
                        maxLength={100}
                        disabled={formState.isSubmitting}
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Video Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <AlignLeft className="w-3.5 h-3.5 text-muted-foreground/60" />
                      {t("upload.description")}
                    </FormLabel>
                    <span className="text-[11px] text-muted-foreground">
                      {description.length}/2000
                    </span>
                  </div>
                  <FormControl>
                    <Textarea
                      placeholder={t("upload.descPlaceholder")}
                      className="min-h-24 bg-muted/30 border-muted-foreground/15 rounded-lg text-sm focus-visible:border-primary/50 resize-y"
                      maxLength={2000}
                      disabled={formState.isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Category & Visibility Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Category */}
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-muted-foreground/60" />
                      Category
                    </FormLabel>
                    <FormControl>
                      <select
                        className="w-full h-11 px-3 rounded-lg bg-muted/30 border border-muted-foreground/15 text-sm text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/50 transition-colors"
                        disabled={formState.isSubmitting}
                        {...field}
                      >
                        {CATEGORIES.map((cat) => (
                          <option key={cat} value={cat} className="bg-popover text-foreground">
                            {cat}
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Visibility */}
              <FormField
                control={form.control}
                name="visibility"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Visibility
                    </FormLabel>
                    <FormControl>
                      <select
                        className="w-full h-11 px-3 rounded-lg bg-muted/30 border border-muted-foreground/15 text-sm text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/50 transition-colors"
                        disabled={formState.isSubmitting}
                        {...field}
                      >
                        <option value="PUBLIC" className="bg-popover text-foreground">
                          Public (Everyone)
                        </option>
                        <option value="UNLISTED" className="bg-popover text-foreground">
                          Unlisted (Direct link)
                        </option>
                        <option value="PRIVATE" className="bg-popover text-foreground">
                          Private (Only you)
                        </option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Tags Input */}
            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-muted-foreground/60" />
                    <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Tags (Comma-separated)
                    </FormLabel>
                  </div>
                  <FormControl>
                    <Input
                      placeholder="e.g. springboot, nextjs, web-dev"
                      className="h-11 bg-muted/30 border-muted-foreground/15 rounded-lg text-sm focus-visible:border-primary/50"
                      disabled={formState.isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <p className="text-[11px] text-muted-foreground">
                    Comma-separated keywords used for video search and Schema.org VideoObject metadata.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Upload Progress Bar */}
            {uploadProgress > 0 && (
              <div className="space-y-2 pt-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5 font-medium text-foreground">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                    Uploading video...
                  </span>
                  <span className="font-semibold text-primary">
                    {uploadProgress}%
                  </span>
                </div>
                <div className="w-full bg-muted/60 rounded-full h-2 overflow-hidden ring-1 ring-border/30">
                  <div
                    className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 h-2 rounded-full transition-all duration-200 ease-out"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={
                formState.isSubmitting || !selectedFile || !videoTitle.trim()
              }
              className="w-full h-11 font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg shadow-blue-500/20 transition-all duration-300 disabled:opacity-50"
            >
              {formState.isSubmitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="animate-spin h-4 w-4" />
                  Uploading... {uploadProgress}%
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <UploadCloud className="w-4 h-4" />
                  {t("upload.publishButton")}
                </span>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
