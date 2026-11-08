"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { getFirebaseAuth, signInWithPopup } from "@/lib/firebase";
import { googleLogin } from "@/utility/requests";
import { useAuth } from "@/store/auth-context";
import { toast } from "sonner";

interface GoogleSignInButtonProps {
  mode?: "login" | "signup";
  className?: string;
  callbackUrl?: string;
}

export function GoogleIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
        fill="#EA4335"
      />
    </svg>
  );
}

export function GoogleSignInButton({
  mode = "login",
  className = "",
  callbackUrl,
}: GoogleSignInButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { login } = useAuth();

  const handleClick = async () => {
    setLoading(true);
    try {
      const { auth: activeAuth, googleProvider: activeProvider } = await getFirebaseAuth();

      const credential = await signInWithPopup(activeAuth, activeProvider);
      const idToken = await credential.user.getIdToken();
      const fullName = credential.user.displayName || undefined;

      const res = await googleLogin({
        idToken,
        fullName,
      });

      if (!res || !res.idToken) {
        throw new Error("Failed to authenticate with Google backend");
      }

      const uid = res.uid || res.user?.userId;
      if (res.idToken && uid) {
        await login(res.idToken, uid);
      }

      toast.success(
        mode === "signup"
          ? "Account created and signed in with Google!"
          : "Signed in with Google successfully!"
      );

      const destination = (() => {
        if (!callbackUrl || typeof callbackUrl !== "string") return "/";
        const trimmed = callbackUrl.trim();
        if (trimmed.startsWith("/") && !trimmed.startsWith("//") && !trimmed.startsWith("/\\")) {
          return trimmed;
        }
        return "/";
      })();
      if (router) {
        router.push(destination);
        router.refresh();
      } else if (typeof window !== "undefined") {
        window.location.href = destination;
      }
    } catch (err: any) {
      if (
        err?.code === "auth/popup-closed-by-user" ||
        err?.code === "auth/cancelled-popup-request"
      ) {
        return;
      }
      console.error("Google sign-in error:", err);
      toast.error(err?.message || "Google sign in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const label = mode === "signup" ? "Sign up with Google" : "Sign in with Google";

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleClick}
      disabled={loading}
      className={`w-full h-11 border border-border/80 bg-background/90 hover:bg-muted/60 dark:hover:bg-muted/30 text-foreground font-medium rounded-lg shadow-sm hover:shadow transition-all duration-200 flex items-center justify-center gap-3 relative group ${className}`}
    >
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      ) : (
        <GoogleIcon className="w-5 h-5 transition-transform duration-200 group-hover:scale-105" />
      )}
      <span>{loading ? (mode === "signup" ? "Creating account..." : "Signing in...") : label}</span>
    </Button>
  );
}
