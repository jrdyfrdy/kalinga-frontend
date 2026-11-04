import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import logo from "@/assets/kalinga-logo.png";
import { useAuth } from "@/context/AuthContext";
import { useActiveRescue } from "@/hooks/useActiveRescue";
import { useResponderDevMenu } from "@/context/ResponderDevMenuContext";
import { NAVIGATION, ROLE_LABELS, flatNavItems, isNavItemActive } from "@/config/navigation";
import { IconButton, Sheet, SheetContent, ThemeToggle } from "@/components/ui";
import { cn } from "@/lib/utils";
import { SidebarNav } from "./shell/SidebarNav";
import { NotificationsMenu } from "./shell/NotificationsMenu";
import { UserMenu } from "./shell/UserMenu";
import { ActiveAssignmentBanner, ResponderDevMenuDialog } from "./shell/ResponderExtras";
import EmergencyFab from "@/components/patients/EmergencyFab";

const COLLAPSE_KEY = "sidebar-collapsed";

function Brand({ to, collapsed = false, inverted = false, onClick }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={cn("flex min-w-0 items-center gap-2.5 rounded-lg", collapsed && "justify-center")}
      aria-label="Kalinga home"
    >
      <img src={logo} alt="" className="size-8 shrink-0 object-contain" />
      {!collapsed && (
        <span className={cn("truncate text-lg font-bold tracking-tight", inverted ? "text-sidebar-foreground" : "text-foreground")}>
          Kalinga
        </span>
      )}
    </Link>
  );
}

/** Five quick taps on the responder logo open the hidden dev menu. */
function useLogoTaps(enabled, onUnlock) {
  const taps = useRef([]);
  return useCallback(
    (event) => {
      if (!enabled) return;
      const now = Date.now();
      taps.current = taps.current.filter((t) => now - t <= 2000).concat(now);
      if (taps.current.length >= 5) {
        event.preventDefault();
        taps.current = [];
        onUnlock();
      }
    },
    [enabled, onUnlock],
  );
}

/**
 * The single application frame for every signed-in role: sidebar (desktop),
 * drawer + bottom bar (mobile), top bar with notifications, theme and account.
 *
 * variant="fullscreen" removes page padding/scrolling for map and console views.
 */
export default function AppShell({ role, children, variant = "default", hideTopbarOnMobile = false, title }) {
  const nav = NAVIGATION[role];
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(COLLAPSE_KEY) || "false") === true;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_KEY, JSON.stringify(collapsed));
    } catch {
      // ignore storage errors
    }
  }, [collapsed]);

  // Close the drawer whenever the route changes.
  useEffect(() => setMobileOpen(false), [pathname]);

  const { hasActiveRescue } = useActiveRescue({ enabled: role === "patient" && !!user, refreshInterval: 30000 });
  const devMenu = useResponderDevMenu();
  const onLogoTap = useLogoTaps(role === "responder", () => devMenu?.setShowDevMenu?.((v) => !v));

  const flags = { activeRescue: hasActiveRescue };
  const pageTitle = useMemo(() => {
    if (title) return title;
    const match = flatNavItems(role).find((item) => isNavItemActive(item, pathname));
    return match?.label || ROLE_LABELS[role];
  }, [role, pathname, title]);

  const accountLink = (label) => nav.account?.find((item) => item.label === label)?.to;

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      window.location.assign("/#hero");
    }
  };

  const bottomItems = (nav.bottomBar || [])
    .map((label) => flatNavItems(role).find((item) => item.label === label))
    .filter(Boolean);
  const hasBottomBar = bottomItems.length > 0;
  const fullscreen = variant === "fullscreen";

  return (
    <div className="flex h-dvh overflow-hidden bg-background text-foreground">
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[1400] focus:rounded-md focus:bg-surface focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:shadow-lg"
      >
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden shrink-0 flex-col bg-sidebar text-sidebar-foreground transition-[width] duration-200 lg:flex",
          collapsed ? "w-[4.5rem]" : "w-64",
        )}
      >
        <div className={cn("flex h-16 items-center gap-2 px-4", collapsed && "justify-center px-0")}>
          <Brand to={nav.home} collapsed={collapsed} inverted onClick={onLogoTap} />
        </div>
        <SidebarNav groups={nav.groups} account={nav.account} collapsed={collapsed} flags={flags} />
        <div className={cn("border-t border-sidebar-border p-3", collapsed && "flex justify-center")}>
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className={cn(
              "flex h-9 items-center gap-3 rounded-lg px-3 text-sm text-sidebar-muted transition-colors hover:bg-sidebar-active hover:text-sidebar-foreground",
              collapsed ? "w-9 justify-center px-0" : "w-full",
            )}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeftOpen className="size-4" aria-hidden="true" /> : <PanelLeftClose className="size-4" aria-hidden="true" />}
            {!collapsed && "Collapse"}
          </button>
        </div>
      </aside>

      {/* Mobile drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" title="Menu" hideHeader className="bg-sidebar text-sidebar-foreground [&>button]:text-sidebar-muted">
          <div className="flex h-full flex-col">
            <div className="flex h-16 items-center px-4">
              <Brand to={nav.home} inverted onClick={onLogoTap} />
            </div>
            <SidebarNav groups={nav.groups} account={nav.account} flags={flags} onNavigate={() => setMobileOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className={cn(
            "z-30 flex h-16 shrink-0 items-center gap-2 border-b border-border bg-surface/90 px-3 backdrop-blur supports-[backdrop-filter]:bg-surface/75 sm:px-4 lg:px-6",
            hideTopbarOnMobile && "hidden md:flex",
          )}
        >
          <IconButton label="Open menu" className="lg:hidden" onClick={() => setMobileOpen(true)}>
            <Menu />
          </IconButton>
          <div className="lg:hidden">
            <Brand to={nav.home} onClick={onLogoTap} />
          </div>
          <h1 className="hidden min-w-0 truncate text-base font-semibold lg:block">{pageTitle}</h1>

          <div className="ml-auto flex items-center gap-1">
            <NotificationsMenu enabled={!!user} seeAllTo={accountLink("Notifications")} />
            <ThemeToggle />
            <div className="ml-1">
              <UserMenu
                user={user}
                role={role}
                profileTo={accountLink("Profile")}
                settingsTo={accountLink("Settings")}
                onLogout={handleLogout}
              />
            </div>
          </div>
        </header>

        {role === "responder" && <ActiveAssignmentBanner />}

        <main
          id="content"
          tabIndex={-1}
          className={cn(
            "min-h-0 flex-1 focus:outline-none",
            fullscreen ? "relative overflow-hidden" : "overflow-y-auto",
            hasBottomBar && !fullscreen && "pb-20 lg:pb-0",
          )}
        >
          {children}
        </main>

        {hasBottomBar && !fullscreen && (
          <nav
            aria-label="Quick navigation"
            className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
          >
            <ul className="mx-auto flex h-16 max-w-lg items-stretch">
              {bottomItems.map((item) => {
                const active = isNavItemActive(item, pathname);
                const Icon = item.icon;
                return (
                  <li key={item.to} className="flex-1">
                    <Link
                      to={item.to}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex h-full flex-col items-center justify-center gap-1 text-[0.6875rem] font-medium transition-colors",
                        active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                        item.tone === "critical" && !active && "text-critical",
                      )}
                    >
                      <Icon className="size-5" aria-hidden="true" />
                      <span className="max-w-full truncate px-1">{item.label.replace("Emergency console", "Console").replace("Hospital navigator", "Navigator").replace("Incident logs", "Incidents")}</span>
                    </Link>
                  </li>
                );
              })}
              <li className="flex-1">
                <button
                  type="button"
                  onClick={() => setMobileOpen(true)}
                  className="flex h-full w-full flex-col items-center justify-center gap-1 text-[0.6875rem] font-medium text-muted-foreground hover:text-foreground"
                >
                  <Menu className="size-5" aria-hidden="true" />
                  More
                </button>
              </li>
            </ul>
          </nav>
        )}
      </div>

      {role === "patient" && <EmergencyFab />}
      {role === "responder" && <ResponderDevMenuDialog />}
    </div>
  );
}
