"use client";

import * as z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import clsx from "clsx";
import { createUser } from "../../utility/requests";
import { toast } from "sonner";
import { redirect, RedirectType } from "next/navigation";
import { MESSAGES } from "@/constants/messages";
import { AVATARS } from "@/constants/avatars"; // Adjust the import path as necessary
import { Eye, EyeOff, Mail, Lock, User, AtSign, ArrowRight, Loader2, UserPlus, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { useUsernameAvailability, cleanHandle } from "@/utility/useUsernameAvailability";
import { GoogleSignInButton } from "./GoogleSignInButton";
import { useLanguage } from "@/store/language-context";
import { safeRedirectPath } from "@/utility/redirect";

const formSchema = z.object({
  fullName: z.string().max(100, { message: "Name must be under 100 characters" }).optional(),
  username: z.string().min(3, { message: "Handle must be at least 3 characters" }).max(30, { message: "Handle must be under 30 characters" }),
  email: z.string().email({ message: "Invalid email address" }),
  password: z
    .string()
    .min(6, { message: "Password must be at least 6 characters" }),
  avatar_url: z.string().url({ message: "Invalid avatar URL" }),
});

export function SignUpForm() {
  const { t } = useLanguage();
  const [showPassword, setShowPassword] = useState(false);
  // Optional return path (e.g. back to the editor to publish). Read on the client to avoid a Suspense boundary.
  const [nextPath, setNextPath] = useState("");
  useEffect(() => {
    setNextPath(safeRedirectPath(new URLSearchParams(window.location.search).get("next"), ""));
  }, []);
  const nextQuery = nextPath ? `next=${encodeURIComponent(nextPath)}` : "";
  const { setUsername, status, message, isAvailable, isChecking } =
    useUsernameAvailability();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      username: "",
      email: "",
      password: "",
      avatar_url: AVATARS[0].src,
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const handle = cleanHandle(values.username);
    if (!isAvailable) {
      toast.error("Please choose a valid and available handle.");
      return;
    }

    try {
      await createUser({
        email: values.email,
        password: values.password,
        username: handle,
        user_name: handle,
        fullName: values.fullName?.trim() || handle,
        avatar_url: values.avatar_url,
      });
      toast.success(MESSAGES.ACCOUNT_CREATED);
      setTimeout(() => {
        redirect(`/auth/login?status=account-created${nextQuery ? `&${nextQuery}` : ""}`, RedirectType.replace);
      }, 500);
    } catch (err) {
      toast.error(MESSAGES.ACCOUNT_CREATION_FAILED + `: ${err}`);
    }
  };

  return (
    <Card className="border border-border/50 shadow-xl dark:shadow-2xl dark:shadow-purple-500/5 bg-card/85 backdrop-blur-md rounded-2xl">
      <CardHeader className="space-y-1 pb-2">
        {/* Decorative gradient bar */}
        <div className="h-1 w-16 rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 mb-4" />

        <CardTitle className="text-2xl font-bold tracking-tight">
          {t("auth.signUpTitle")}
        </CardTitle>
        <CardDescription className="text-muted-foreground/80">
          {t("auth.signUpSubtitle")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <GoogleSignInButton mode="signup" callbackUrl={nextPath || undefined} />

        <div className="relative my-3">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-muted-foreground/15" />
          </div>
          <div className="relative flex justify-center text-xs uppercase tracking-wider">
            <span className="bg-card px-3 text-muted-foreground/70 font-medium">
              or register with email
            </span>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            {/* Avatar Selection */}
            <FormField
              control={form.control}
              name="avatar_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Choose your avatar
                  </FormLabel>
                  <div className="flex gap-3 flex-wrap">
                    {AVATARS.map((avatar) => (
                      <button
                        type="button"
                        key={avatar.src}
                        onClick={() => {
                          field.onChange(avatar.src);
                        }}
                        className={clsx(
                          "rounded-full p-0.5 transition-all duration-200",
                          field.value === avatar.src
                            ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110"
                            : "ring-1 ring-muted-foreground/10 hover:ring-muted-foreground/30 opacity-60 hover:opacity-100"
                        )}
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={avatar.src} alt={avatar.label} />
                          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xs">
                            {avatar.fallback}
                          </AvatarFallback>
                        </Avatar>
                      </button>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Full Name */}
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Full Name / Channel Name
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                      <Input
                        placeholder="e.g. Marques Brownlee"
                        className="pl-10 h-11 bg-muted/30 border-muted-foreground/10 focus-visible:border-primary/50 transition-colors"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <p className="text-[11px] text-muted-foreground/70">
                    Public display name shown on your channel, videos, and comments.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Unique Handle (@username) */}
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                    <span>Unique Handle</span>
                    {status !== "idle" && (
                      <span
                        className={clsx(
                          "inline-flex items-center gap-1 text-[11px] font-semibold lowercase px-2 py-0.5 rounded-full border",
                          status === "available" && "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
                          status === "taken" && "text-rose-500 bg-rose-500/10 border-rose-500/20",
                          status === "checking" && "text-primary bg-primary/10 border-primary/20",
                          status === "invalid" && "text-amber-500 bg-amber-500/10 border-amber-500/20"
                        )}
                      >
                        {status === "checking" && <Loader2 className="w-3 h-3 animate-spin" />}
                        {status === "available" && <CheckCircle2 className="w-3 h-3" />}
                        {status === "taken" && <XCircle className="w-3 h-3" />}
                        {status === "invalid" && <AlertCircle className="w-3 h-3" />}
                        {message}
                      </span>
                    )}
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                      <Input
                        placeholder="mkbhd"
                        className={clsx(
                          "pl-10 h-11 bg-muted/30 transition-colors font-mono text-sm",
                          status === "available" && "border-emerald-500/50 focus-visible:border-emerald-500",
                          status === "taken" && "border-rose-500/50 focus-visible:border-rose-500",
                          status === "invalid" && "border-amber-500/50 focus-visible:border-amber-500"
                        )}
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          setUsername(e.target.value);
                        }}
                      />
                    </div>
                  </FormControl>
                  <p className="text-[11px] text-muted-foreground/70">
                    3-30 letters, numbers, and underscores. Used for your profile URL and @mentions.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Email */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Email
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                      <Input
                        placeholder="you@example.com"
                        className="pl-10 h-11 bg-muted/30 border-muted-foreground/10 focus-visible:border-primary/50 transition-colors"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Password */}
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Password
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        className="pl-10 pr-10 h-11 bg-muted/30 border-muted-foreground/10 focus-visible:border-primary/50 transition-colors"
                        {...field}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                        tabIndex={-1}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full h-11 font-semibold bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white shadow-lg shadow-pink-500/20 dark:shadow-pink-500/10 transition-all duration-300 hover:shadow-xl hover:shadow-pink-500/30 disabled:opacity-50"
              disabled={form.formState.isSubmitting || !isAvailable || isChecking}
            >
              {form.formState.isSubmitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating account...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  {t("auth.signUpButton")}
                  <ArrowRight className="h-4 w-4 ml-1" />
                </span>
              )}
            </Button>
          </form>
        </Form>

        <div className="text-center text-sm text-muted-foreground pt-1">
          {t("auth.hasAccount")}{" "}
          <Link
            href={`/auth/login${nextQuery ? `?${nextQuery}` : ""}`}
            className="font-semibold text-primary hover:text-primary/80 transition-colors"
          >
            {t("auth.signInButton")}
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
