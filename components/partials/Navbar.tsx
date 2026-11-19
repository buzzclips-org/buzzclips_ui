"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";
import { Moon, Sun, Play } from "lucide-react";
import clsx from "clsx";

import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

import { useAuth } from "@/store/auth-context";
import { useLanguage } from "@/store/language-context";
import { LanguageSwitcher } from "@/components/partials/LanguageSwitcher";

export function Navbar() {
  const pathname = usePathname();
  const { setTheme } = useTheme();
  const { isAuthenticated, isLoaded = true, logout, user } = useAuth();
  const { t, locale, setLocale } = useLanguage();

  if (pathname?.startsWith("/embed")) {
    return null;
  }
  const isReels = pathname === "/reels" || pathname?.startsWith("/reels/");

  return (
    <header
      className={clsx(
        "w-full border-b border-border/50 px-4 py-2.5 sticky top-0 z-50 backdrop-blur-md bg-background/80 shadow-xs",
        isReels && "hidden md:block"
      )}
    >
      <div className="container mx-auto flex items-center justify-between gap-4">
        {/* === Left: Brand Logo === */}
        <motion.div
          className="cursor-pointer shrink-0"
          whileHover={{ scale: 1.05 }}
          transition={{ type: "spring", stiffness: 400, damping: 12 }}
        >
          <Link href="/" className="group flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-md shadow-purple-500/20 group-hover:shadow-purple-500/40 transition-shadow">
              <Play className="w-4 h-4 text-white fill-white ml-0.5" />
            </div>
            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent font-logo">
              buzzclips
            </span>
          </Link>
        </motion.div>

        {/* === Center: Navigation (Desktop only) === */}
        <div className="hidden md:flex items-center">
          <NavigationMenu>
            <NavigationMenuList className="gap-1">
              <NavigationMenuItem>
                <NavigationMenuLink asChild>
                  <Link
                    href="/"
                    className="text-sm font-medium px-3.5 py-2 hover:underline"
                  >
                    {t("nav.editor")}
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <NavigationMenuLink asChild>
                  <Link
                    href="/explore"
                    className="text-sm font-medium px-3.5 py-2 hover:underline"
                  >
                    {t("nav.explore")}
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <NavigationMenuLink asChild>
                  <Link
                    href="/reels"
                    className="text-sm font-medium px-3.5 py-2 hover:underline flex items-center gap-1.5"
                  >
                    <span>{t("nav.reels")}</span>
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <Link
                  href="/tv"
                  className="text-sm font-medium px-3.5 py-2 hover:underline !inline-flex !flex-row items-center gap-1.5 whitespace-nowrap"
                >
                  <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                    {t("nav.liveTv")}
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0 ring-2 ring-red-500/20" />
                  </span>
                </Link>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <NavigationMenuLink asChild>
                  <Link
                    href="/trending"
                    className="text-sm font-medium px-3.5 py-2 hover:underline flex items-center gap-1.5"
                  >
                    {t("nav.trending")}
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        </div>

        {/* === Right: Auth, Theme === */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Auth Section (Desktop only - Mobile uses MobileNav avatar profile tab) */}
          <div className="hidden md:flex items-center min-w-[76px] justify-end">
            {!isLoaded ? (
              <div className="w-18 h-9 rounded-md bg-muted/30 animate-pulse" />
            ) : !isAuthenticated ? (
              <Link href="/auth/login">
                <Button variant="outline">{t("nav.signIn")}</Button>
              </Link>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Avatar className="cursor-pointer">
                    <AvatarImage
                      src={user?.avatar_url || ""}
                      alt={user?.fullName || user?.user_name || "User"}
                    />
                    <AvatarFallback>
                      {(user?.fullName || user?.user_name)
                        ?.charAt(0)
                        ?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {user?.username && (
                    <DropdownMenuItem asChild>
                      <Link href={`/channel/@${user.username}`}>{t("nav.yourChannel")}</Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem asChild>
                    <Link href="/video/upload">{t("nav.upload")}</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/history">{t("nav.watchHistory")}</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/playlists">{t("nav.playlists")}</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/my-videos">{t("nav.myVideos")}</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/profile">{t("nav.profile")}</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={logout} className="text-red-500">
                    {t("nav.logOut")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Quick Convert to English Button (Visible when on non-English locale) */}
          {locale !== "en" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocale("en")}
              className="h-8 px-2.5 rounded-full text-xs font-semibold border-primary/40 bg-primary/10 hover:bg-primary/20 text-primary transition-all cursor-pointer flex items-center gap-1"
              title="Convert back to English"
            >
              <span>English</span>
              <span className="text-[10px] opacity-70 uppercase">(EN)</span>
            </Button>
          )}

          {/* Language Switcher */}
          <LanguageSwitcher variant="icon" />

          {/* Theme Toggle */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Toggle theme">
                <Sun className="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
                <Moon className="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setTheme("light")}>
                {t("nav.light")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("dark")}>
                {t("nav.dark")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("system")}>
                {t("nav.system")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
