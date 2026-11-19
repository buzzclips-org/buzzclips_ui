"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Scissors, Film, Tv, User } from "lucide-react";
import { useAuth } from "@/store/auth-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import clsx from "clsx";

export function MobileNav() {
  const pathname = usePathname();
  const { isAuthenticated, isLoaded = true, user } = useAuth();

  if (pathname?.startsWith("/embed")) {
    return null;
  }

  const navItems = [
    {
      label: "Explore",
      href: "/explore",
      icon: Compass,
      isActive: pathname === "/explore" || pathname.startsWith("/category") || pathname.startsWith("/tag"),
    },
    {
      label: "Reels",
      href: "/reels",
      icon: Film,
      isActive: pathname.startsWith("/reels"),
    },
    {
      label: "Create",
      href: "/",
      icon: Scissors,
      isPrimary: true,
      isActive: pathname === "/" || pathname === "/video/upload",
    },
    {
      label: "Live TV",
      href: "/tv",
      icon: Tv,
      isLive: true,
      isActive: pathname.startsWith("/tv"),
    },
    {
      label: isAuthenticated ? (user?.fullName || user?.user_name || "You") : "Sign In",
      href: isAuthenticated ? "/profile" : "/auth/login",
      icon: User,
      isProfile: true,
      isActive: pathname.startsWith("/profile") || pathname.startsWith("/channel") || pathname.startsWith("/history") || pathname.startsWith("/playlists"),
    },
  ];

  return (
    <nav
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t border-border/50 px-2 py-1.5 shadow-lg safe-bottom"
    >
      <div className="flex items-center justify-around max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;

          if (item.isPrimary) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "flex flex-col items-center justify-center py-1 px-2 rounded-lg transition-colors min-w-[56px] group",
                  item.isActive
                    ? "text-primary font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
                aria-label={item.label}
              >
                <div
                  className={clsx(
                    "w-8 h-8 rounded-full flex items-center justify-center transition-all group-active:scale-95 border",
                    item.isActive
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "bg-muted/70 hover:bg-muted text-foreground/80 hover:text-foreground border-border/50"
                  )}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-[10px] mt-0.5 truncate max-w-[54px]">
                  {item.label}
                </span>
              </Link>
            );
          }

          if (item.isProfile) {
            if (!isLoaded) {
              return (
                <div
                  key={item.href}
                  className="flex flex-col items-center justify-center py-1 px-2 rounded-lg min-w-[56px]"
                >
                  <div className="w-5 h-5 rounded-full bg-muted/40 animate-pulse" />
                  <span className="text-[10px] mt-0.5 text-muted-foreground/50">You</span>
                </div>
              );
            }
            if (isAuthenticated && user) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    "flex flex-col items-center justify-center py-1 px-2 rounded-lg transition-colors min-w-[56px]",
                    item.isActive
                      ? "text-primary font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  aria-label={item.label}
                >
                  <Avatar className="w-5 h-5 ring-1 ring-border">
                    <AvatarImage src={user.avatar_url || ""} alt={item.label} />
                    <AvatarFallback className="text-[10px] bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold">
                      {(user.fullName || user.user_name || "U")[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-[10px] truncate max-w-[54px] mt-0.5">
                    {item.label}
                  </span>
                </Link>
              );
            }
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex flex-col items-center justify-center py-1 px-2 rounded-lg transition-colors min-w-[56px] relative",
                item.isActive
                  ? "text-primary font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-label={item.label}
            >
              <div>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] mt-0.5 whitespace-nowrap inline-flex items-center gap-1">
                <span>{item.label}</span>
                {item.isLive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0 ring-1 ring-red-500/30" />
                )}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
export default MobileNav;
