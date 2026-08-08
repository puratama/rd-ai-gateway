"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  LayoutDashboard,
  Key,
  CreditCard,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronDown,
  Menu,
  X,
  Wallet,
  Users,
  Box,
  Gauge,
  UserRound,
  Megaphone,
  LifeBuoy,
} from "lucide-react";
import { siteConfig } from "@/lib/site-config";
import { useSiteConfig, type PublicSiteConfig } from "@/lib/use-site-config";
import NotificationBell from "@/components/NotificationBell";
import AnnouncementBar from "@/components/AnnouncementBar";
import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Suspense, useState, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const userNavItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/plan", label: "Token Plan", icon: CreditCard },
  { href: "/models", label: "Models", icon: CreditCard },
  { href: "/keys", label: "API Keys", icon: Key },
  { href: "/usage", label: "Usage", icon: BarChart3 },
];

interface NavGroup {
  label: string;
  items: NavItem[];
}

const adminNavGroups: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'User',
    items: [
      { href: '/admin/users', label: 'Users', icon: Users },
      { href: '/admin/keys', label: 'API Keys', icon: Key },
      { href: '/admin/wallet', label: 'Wallet', icon: Wallet },
    ],
  },
  {
    label: 'Product',
    items: [
      { href: '/admin/models', label: 'Models', icon: Box },
      { href: '/admin/plans', label: 'Plans', icon: CreditCard },
    ],
  },
  {
    label: 'System',
    items: [
      { href: '/admin/announcements', label: 'Announcements', icon: Megaphone },
      { href: '/admin/support', label: 'Support', icon: LifeBuoy },
      { href: '/admin/settings', label: 'Settings', icon: Settings },
    ],
  },
];

interface AppShellProps {
  children: React.ReactNode;
  variant?: "user" | "admin";
}

function BrandMark({ href, siteCfg }: { href: string; siteCfg: PublicSiteConfig }) {
  const name = siteCfg.siteName || siteConfig.brandName;
  if (!siteCfg.loaded) {
    return (
      <div className="flex items-center gap-2.5">
        <Skeleton className="h-8 w-8 rounded-lg" />
        <Skeleton className="h-5 w-20" />
      </div>
    );
  }
  return (
    <Link href={href} className="flex items-center gap-2.5">
      {siteCfg.logoMode !== "name" && <BrandLogo siteCfg={siteCfg} />}
      {siteCfg.logoMode !== "logo" && <span className="text-lg font-bold tracking-tight">{name}</span>}
    </Link>
  );
}

export default function AppShell(props: AppShellProps) {
  return (
    <Suspense fallback={null}>
      <AppShellContent {...props} />
    </Suspense>
  );
}

function AppShellContent({ children, variant = "user" }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<{ id: string; name: string | null; email: string; role: string } | null>(null);
  const [wallet, setWallet] = useState<{ balance: number } | null>(null);
  const siteCfg = useSiteConfig();

  useEffect(() => {
    void (async () => {
      try {
        const [profileRes, balanceRes] = await Promise.all([
          fetch("/api/user/profile").then((r) => (r.ok ? (r.json() as Promise<{ user: typeof user }>) : null)).catch(() => null),
          fetch("/api/wallet/balance").then((r) => (r.ok ? (r.json() as Promise<{ balance: number }>) : null)).catch(() => null),
        ]);
        if (profileRes?.user) setUser(profileRes.user);
        if (balanceRes) setWallet(balanceRes);
      } catch {
        // ignore
      }
    })();
  }, []);

  const logoHref = variant === "admin" ? "/admin" : "/dashboard";
  const logoLabel = siteCfg.siteName || siteConfig.brandName;
  const settingsTab = pathname === "/admin/settings" ? searchParams.get("tab")?.replace(/-/g, " ") : null;
  const adminSection = pathname === "/admin/users"
    ? "Users"
    : pathname === "/admin/models"
    ? "Models"
    : pathname === "/admin/plans"
    ? "Plans"
    : pathname === "/admin/keys"
    ? "API Keys"
    : pathname === "/admin/settings"
    ? settingsTab || "Settings"
    : pathname === "/admin/wallet"
    ? "Wallet"
    : pathname === "/admin/announcements"
    ? "Announcements"
    : pathname === "/admin/support"
    ? "Support"
    : searchParams.get("tab")?.replace(/-/g, " ") || "Dashboard";
  const userSection = userNavItems.find((item) => pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href)))?.label || siteConfig.brandName;
  const currentSection = variant === "admin" ? adminSection : userSection;

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    localStorage.removeItem("xperimne-api-key");
    localStorage.removeItem("xperimne-user");
    router.replace("/login");
  };

  const isActiveNav = (item: NavItem) => {
    const isActive = pathname === item.href || (item.href !== "/dashboard" && item.href !== "/admin" && pathname.startsWith(item.href));
    const isQueryAdmin = variant === "admin" && item.href.includes("?");
    const currentTab = searchParams.get("tab") || "overview";
    const itemTab = isQueryAdmin ? new URL(item.href, "http://localhost").searchParams.get("tab") || "overview" : null;
    return isQueryAdmin ? (pathname === "/admin" && currentTab === itemTab) : isActive;
  };

  if (variant === "user") {
    return (
      <div className="h-full overflow-hidden flex flex-col bg-[radial-gradient(circle_at_top_left,color-mix(in_oklch,var(--color-primary)_18%,transparent),transparent_32rem),linear-gradient(180deg,var(--color-background),color-mix(in_oklch,var(--color-background)_82%,var(--color-card)))] text-foreground">
        <AnnouncementBar />
        <header className="h-16 shrink-0 border-b border-border bg-card/85 shadow-lg shadow-primary/5 backdrop-blur-lg">
          <div className="mx-auto flex h-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
            <BrandMark href="/dashboard" siteCfg={siteCfg} />

            <nav className="hidden items-center gap-1 lg:flex" aria-label="Client navigation">
              {userNavItems.map((item) => {
                const active = isActiveNav(item);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "rounded-full px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-primary/10 hover:text-primary"
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="flex items-center gap-2">
              <NotificationBell />
              <div className="hidden sm:block">
                <DropdownMenu>
                  <DropdownMenuTrigger render={
                    <Button variant="ghost" size="sm" className="gap-1.5 pl-1 pr-2 hover:bg-primary/10 hover:text-primary">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-[11px] font-bold text-primary-foreground">
                        <UserRound />
                      </span>
                      <span className="hidden md:inline">{user?.name || user?.email}</span>
                      <ChevronDown className="h-3.5 w-3.5" />
                    </Button>
                  } />
                  <DropdownMenuContent align="end" className="w-64 space-y-1 p-2">
                    <div className="flex items-start gap-3 rounded-xl bg-muted/30 p-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-sm font-bold text-primary-foreground">
                        <UserRound />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{user?.name || user?.email}</p>
                        <p className="truncate text-xs text-muted-foreground">{user?.email || ""}</p>
                      </div>
                    </div>

                    <DropdownMenuSeparator className="my-2" />
                    {user?.role === "superadmin" && (
                      <DropdownMenuItem onClick={() => router.push("/admin")} className="flex items-center gap-2 rounded-lg cursor-pointer hover:bg-primary/10 hover:text-primary focus:bg-primary/10 focus:text-primary">
                        <Gauge className="h-4 w-4" /> Admin Dashboard
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => router.push("/my/wallet")} className="flex items-center gap-2 rounded-lg cursor-pointer hover:bg-primary/10 hover:text-primary focus:bg-primary/10 focus:text-primary">
                      <Wallet className="h-4 w-4" /> My Wallet
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push("/my/plan")} className="flex items-center gap-2 rounded-lg cursor-pointer hover:bg-primary/10 hover:text-primary focus:bg-primary/10 focus:text-primary">
                      <CreditCard className="h-4 w-4" /> My Plan
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push("/support")} className="flex items-center gap-2 rounded-lg cursor-pointer hover:bg-primary/10 hover:text-primary focus:bg-primary/10 focus:text-primary">
                      <LifeBuoy className="h-4 w-4" /> Support
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push("/settings")} className="flex items-center gap-2 rounded-lg cursor-pointer hover:bg-primary/10 hover:text-primary focus:bg-primary/10 focus:text-primary">
                      <Settings className="h-4 w-4" /> Settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="my-2" />
                    <DropdownMenuItem variant="destructive" onClick={handleLogout} className="flex items-center gap-2 rounded-lg cursor-pointer">
                      <LogOut className="h-4 w-4" /> Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <Button variant="ghost" size="icon-sm" className="lg:hidden" onClick={() => setMobileOpen((value) => !value)} aria-expanded={mobileOpen}>
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </header>

        {mobileOpen && (
          <div className="border-b border-border bg-card/95 px-4 py-3 shadow-lg shadow-primary/5 backdrop-blur-lg lg:hidden">
            <nav className="mx-auto grid max-w-6xl gap-1" aria-label="Mobile client navigation">
              {userNavItems.map((item) => {
                const Icon = item.icon;
                const active = isActiveNav(item);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                      active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-primary/10 hover:text-primary"
                    )}
                  >
                    <Icon className="h-4 w-4" /> {item.label}
                  </Link>
                );
              })}
              <button
                type="button"
                onClick={handleLogout}
                className="mt-1 flex items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              >
                <LogOut className="h-4 w-4" /> Logout
              </button>
            </nav>
          </div>
        )}

        <main className="flex-1 min-h-0 overflow-hidden">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="h-full flex bg-background overflow-hidden">
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col bg-card border-r border-border transition-all duration-200 lg:relative lg:z-auto",
          collapsed ? "lg:w-16" : "lg:w-64",
          mobileOpen ? "w-64 translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="h-14 flex items-center justify-between px-4 border-b border-border shrink-0">
          {!collapsed ? <BrandMark href={logoHref} siteCfg={siteCfg} /> : (
            <Link href={logoHref} className="mx-auto">
              <BrandLogo siteCfg={siteCfg} />
            </Link>
          )}
          <Button variant="ghost" size="icon-sm" className="hidden lg:flex" onClick={() => setCollapsed(!collapsed)}>
            <ChevronLeft className={cn("w-4 h-4 transition-transform", collapsed && "rotate-180")} />
          </Button>
          <Button variant="ghost" size="icon-sm" className="lg:hidden" onClick={() => setMobileOpen(false)}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-3">
          {collapsed ? (
            adminNavGroups.flatMap(g => g.items).map((item) => {
              const Icon = item.icon;
              const active = isActiveNav(item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center justify-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                  title={item.label}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                </Link>
              );
            })
          ) : (
            adminNavGroups.map((group) => (
              <div key={group.label}>
                <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                  {group.label}
                </p>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActiveNav(item);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                        active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            ))
          )}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 flex items-center gap-3 px-4 border-b border-border bg-card/80 backdrop-blur-sm lg:hidden shrink-0">
          <Button variant="ghost" size="icon-sm" onClick={() => setMobileOpen(true)}>
            <Menu className="w-5 h-5" />
          </Button>
          <BrandMark href={logoHref} siteCfg={siteCfg} />
        </header>

        <header className="hidden h-14 shrink-0 items-center justify-between border-b border-border bg-card/80 px-6 backdrop-blur-sm lg:flex">
          <nav className="flex min-w-0 items-center gap-2 text-sm" aria-label="Breadcrumb">
            {siteCfg.loaded ? (
              <Link href={logoHref} className="font-medium text-muted-foreground hover:text-foreground">{logoLabel}</Link>
            ) : (
              <Skeleton className="h-4 w-16" />
            )}
            <span className="text-muted-foreground">/</span>
            {(pathname === "/admin/settings" && settingsTab) ? (
              <>
                <Link href="/admin/settings" className="font-medium text-muted-foreground hover:text-foreground">Settings</Link>
                <span className="text-muted-foreground">/</span>
                <span className="truncate font-semibold capitalize text-foreground">{settingsTab}</span>
              </>
            ) : (
              <span className="truncate font-semibold capitalize text-foreground">{currentSection}</span>
            )}
          </nav>
          <div className="flex items-center gap-2">
            <div>
              <DropdownMenu>
                <DropdownMenuTrigger render={
                  <Button variant="ghost" size="sm" className="gap-1.5 pl-1 pr-2 hover:bg-primary/10 hover:text-primary">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-[11px] font-bold text-primary-foreground">
                      <UserRound />
                    </span>
                    <span className="hidden md:inline">{user?.name || user?.email}</span>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </Button>
                } />
                <DropdownMenuContent align="end" className="w-64 space-y-1 p-2">
                  <div className="flex items-start gap-3 rounded-xl bg-muted/30 p-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-sm font-bold text-primary-foreground">
                      <UserRound />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{user?.name || user?.email}</p>
                      <p className="truncate text-xs text-muted-foreground">{user?.email || ""}</p>
                    </div>
                  </div>
                  <DropdownMenuSeparator className="my-2" />
                  <DropdownMenuItem onClick={() => router.push("/dashboard")} className="flex items-center gap-2 rounded-lg cursor-pointer hover:bg-primary/10 hover:text-primary focus:bg-primary/10 focus:text-primary">
                    <Gauge className="h-4 w-4" /> Client Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push("/settings")} className="flex items-center gap-2 rounded-lg cursor-pointer hover:bg-primary/10 hover:text-primary focus:bg-primary/10 focus:text-primary">
                    <Settings className="h-4 w-4" /> Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="my-2" />
                  <DropdownMenuItem variant="destructive" onClick={handleLogout} className="flex items-center gap-2 rounded-lg cursor-pointer">
                    <LogOut className="h-4 w-4" /> Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
