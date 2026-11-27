// ============================================================
// Nimantro — Interactive Dashboard Shell
// apps/web/components/layout/DashboardShell.tsx
// ============================================================

"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  CalendarDays,
  Download,
  LayoutDashboard,
  LayoutTemplate,
  LogOut,
  Menu,
  Settings,
  X,
} from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  NimantroLogo,
  cn,
} from "@nimantro/ui";
import { useAuth } from "@/hooks/useAuth";
import { useLocale } from "@/hooks/useLocale";
import { LanguageSwitcher } from "./LanguageSwitcher";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, signOut } = useAuth();
  const { t } = useLocale();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const navLinks = [
    { href: "/dashboard", icon: LayoutDashboard, labelKey: "nav.overview", exact: true },
    { href: "/dashboard/events", icon: CalendarDays, labelKey: "nav.events", exact: false },
    { href: "/dashboard/exports", icon: Download, labelKey: "nav.exports", exact: false },
    { href: "/dashboard/notifications", icon: Bell, labelKey: "nav.notifications", exact: false },
    { href: "/dashboard/settings/profile", icon: Settings, labelKey: "nav.settings", exact: false },
  ];

  const displayName =
    profile?.displayName || user?.displayName || user?.email?.split("@")[0] || "Host";
  const initials = displayName
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  async function handleSignOut() {
    await signOut();
    router.push("/login");
    router.refresh();
  }

  const navContent = (
    <nav className="flex-1 px-3 py-4 overflow-y-auto" aria-label="Dashboard navigation">
      <p className="px-2.5 pb-2 text-xs font-normal text-muted-foreground">
        {t("nav.workspace")}
      </p>
      <div className="space-y-1">
        {navLinks.map(({ href, icon: Icon, labelKey, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "relative flex h-9 items-center gap-2.5 rounded-md border px-2.5 text-sm transition-[background-color,color,border-color] duration-150",
                active
                  ? "border-border bg-card font-medium text-foreground shadow-card"
                  : "border-transparent font-normal text-muted-foreground hover:bg-card/60 hover:text-foreground"
              )}
            >
              {active && (
                <span
                  className="absolute inset-y-1.5 left-0 w-0.5 bg-primary"
                  aria-hidden="true"
                />
              )}
              <Icon
                className={cn(
                  "h-4 w-4 shrink-0",
                  active ? "text-primary" : "text-muted-foreground"
                )}
                strokeWidth={1.5}
                aria-hidden="true"
              />
              <span className="truncate">{t(labelKey)}</span>
            </Link>
          );
        })}
      </div>

      <p className="mt-6 mb-2 px-2.5 text-xs font-normal text-muted-foreground">
        {t("nav.catalog")}
      </p>
      <Link
        href="/templates"
        onClick={() => setMobileOpen(false)}
        className="flex h-9 items-center gap-2.5 rounded-md border border-transparent px-2.5 text-sm font-normal text-muted-foreground transition-[background-color,color] duration-150 hover:bg-card/60 hover:text-foreground"
      >
        <LayoutTemplate className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.5} aria-hidden="true" />
        <span className="truncate">{t("nav.templateGallery")}</span>
      </Link>
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-60 shrink-0 flex-col border-r border-border bg-[#F4F2ED]">
        <div className="flex h-14 items-center border-b border-border px-4">
          <Link href="/dashboard">
            <NimantroLogo size="sm" />
          </Link>
        </div>

        {navContent}

        <div className="space-y-2 border-t border-border p-3">
          <LanguageSwitcher variant="segmented" persistToProfile className="w-full" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center gap-2.5 rounded-md p-2 text-left transition-colors hover:bg-card/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Avatar className="h-8 w-8 shrink-0">
                  {user?.photoURL && <AvatarImage src={user.photoURL} alt={displayName} />}
                  <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {displayName}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {user?.email ?? ""}
                  </p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>{t("nav.myAccount")}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/dashboard/settings/profile">
                  {t("nav.profileAndSettings")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                <LogOut className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                {t("auth.signOut")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-foreground/30"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 flex w-60 flex-col border-r border-border bg-[#F4F2ED] shadow-modal">
            <div className="flex h-14 items-center justify-between border-b border-border px-4">
              <NimantroLogo size="sm" />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setMobileOpen(false)}
                aria-label="Close navigation"
              >
                <X className="h-4 w-4" strokeWidth={1.5} />
              </Button>
            </div>
            {navContent}
            <div className="space-y-2 border-t border-border p-3">
              <LanguageSwitcher variant="segmented" persistToProfile className="w-full" />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                {t("auth.signOut")}
              </Button>
            </div>
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4 lg:hidden">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
            >
              <Menu className="h-4 w-4" strokeWidth={1.5} />
            </Button>
            <Link href="/dashboard">
              <NimantroLogo size="sm" />
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher variant="segmented" persistToProfile />
            <Link href="/dashboard/settings/profile">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
            </Link>
          </div>
        </header>

        <main className="w-full max-w-[1440px] flex-1 p-6 sm:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
