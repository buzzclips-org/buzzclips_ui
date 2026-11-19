"use client";

import { useState } from "react";
import { safeRedirectPath } from "@/utility/redirect";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { loginUser, verifyToken } from "../../utility/requests";
import { toast } from "sonner";
import { useAuth } from "@/store/auth-context";
import { useLanguage } from "@/store/language-context";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { MESSAGES } from "@/constants/messages";
import { Eye, EyeOff, Mail, Lock, LogIn, ArrowRight, Loader2 } from "lucide-react";
import { GoogleSignInButton } from "./GoogleSignInButton";

const loginSchema = z.object({
  email: z.string().min(1, "Email, username, or @handle is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const { login } = useAuth();
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const nextPath = safeRedirectPath(searchParams.get("next"));
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const param = searchParams.get("status");
    if (param === "account-created") {
      setMessage(MESSAGES.ACCOUNT_CREATION_SUCCESS);
    } else if (param === "user-not-logged-in") {
      setTimeout(() => {
        toast.error(MESSAGES.USER_NOT_AUTHENTICATED);
      }, 500);
    }
  }, [searchParams]);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const [isLoading, setIsLoading] = useState(false);

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    let loggedIn = false;
    try {
      const identifier = data.email.trim();
      const res = await loginUser({
        identifier,
        email: identifier,
        password: data.password,
      });

      if (!res || !res.idToken) {
        throw new Error(MESSAGES.LOGIN_FAILED_GENERIC);
      }

      const uid = await verifyToken(res.idToken);
      if (!uid || !uid.id) {
        throw new Error(MESSAGES.LOGIN_FAILED_GENERIC);
      }

      await login(res.idToken, uid.id);
      toast.success(MESSAGES.LOGIN_SUCCESS);
      loggedIn = true;
    } catch (err) {
      console.error("Login failed", err);
      toast.error(MESSAGES.LOGIN_FAILED);
    } finally {
      setIsLoading(false);
    }

    if (loggedIn) {
      window.location.replace(nextPath);
    }
  };

  return (
    <Card className="border border-border/50 shadow-xl dark:shadow-2xl dark:shadow-purple-500/5 bg-card/85 backdrop-blur-md rounded-2xl">
      <CardHeader className="space-y-1 pb-2">
        {/* Decorative gradient bar */}
        <div className="h-1 w-16 rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 mb-4" />

        <CardTitle className="text-2xl font-bold tracking-tight">
          {message ? (
            <span className="text-green-500">{message}</span>
          ) : (
            t("auth.signInTitle")
          )}
        </CardTitle>
        <CardDescription className="text-muted-foreground/80">
          {t("auth.signInSubtitle")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <GoogleSignInButton mode="login" callbackUrl={nextPath} />

        <div className="relative my-3">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-muted-foreground/15" />
          </div>
          <div className="relative flex justify-center text-xs uppercase tracking-wider">
            <span className="bg-card px-3 text-muted-foreground/70 font-medium">
              or continue with
            </span>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Email, Username, or @handle
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                      <Input
                        placeholder="you@example.com, username, or @handle"
                        autoCapitalize="none"
                        autoCorrect="off"
                        className="pl-10 h-11 bg-muted/30 border-muted-foreground/10 focus-visible:border-primary/50 transition-colors"
                        {...field}
                        disabled={isLoading}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {t("auth.passwordLabel")}
                    </FormLabel>
                    <Link
                      href="/auth/reset"
                      className="text-xs text-primary/70 hover:text-primary transition-colors"
                    >
                      {t("auth.forgotPassword")}
                    </Link>
                  </div>
                  <FormControl>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        className="pl-10 pr-10 h-11 bg-muted/30 border-muted-foreground/10 focus-visible:border-primary/50 transition-colors"
                        {...field}
                        disabled={isLoading}
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
            <Button
              type="submit"
              className="w-full h-11 font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg shadow-blue-500/20 dark:shadow-blue-500/10 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/30"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <LogIn className="h-4 w-4" />
                  {t("auth.signInButton")}
                  <ArrowRight className="h-4 w-4 ml-1" />
                </span>
              )}
            </Button>
            <div className="text-center text-sm text-muted-foreground pt-1">
              {t("auth.noAccount")}{" "}
              <Link
                href="/auth/signup"
                className="font-semibold text-primary hover:text-primary/80 transition-colors"
              >
                {t("auth.signUpButton")}
              </Link>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
