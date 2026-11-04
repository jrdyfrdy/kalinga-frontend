import { useEffect, useState } from "react";
import { HashLink } from "react-router-hash-link";
import { Link } from "react-router-dom";
import { LayoutDashboard, LogOut, Menu, ShieldCheck } from "lucide-react";
import logo from "../assets/kalinga-logo.png";
import { useAuth } from "../context/AuthContext";
import { getDefaultRouteForRole } from "../utils/roleRouting";
import { cn } from "@/lib/utils";
import {
  Avatar,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Sheet,
  SheetContent,
  ThemeToggle,
} from "@/components/ui";

const NAV_ITEMS = [
  { name: "Home", href: "/#hero" },
  { name: "About", href: "/#about" },
  { name: "Mission", href: "/#mission" },
  { name: "Contact", href: "/#contact" },
];

/** Public site navigation (landing, auth and information pages). */
export const NavbarA = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const verified = user?.verification_status === "verified";
  const accountTarget = verified ? getDefaultRouteForRole(user?.role, user) : "/verification-pending";
  const accountLabel = verified ? "Go to dashboard" : "Verification status";

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      window.location.assign("/#hero");
    }
  };

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 border-b transition-colors",
        scrolled ? "border-border bg-surface/90 shadow-xs backdrop-blur" : "border-transparent bg-background/80 backdrop-blur",
      )}
    >
      <div className="container flex h-16 items-center justify-between gap-4">
        <HashLink smooth to="/#hero" className="flex items-center gap-2.5" aria-label="Kalinga home">
          <img src={logo} alt="" className="size-9 object-contain" />
          <span className="text-xl font-bold tracking-tight text-foreground">Kalinga</span>
        </HashLink>

        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map((item) => (
            <HashLink
              key={item.name}
              smooth
              to={item.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
            >
              {item.name}
            </HashLink>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          <ThemeToggle />
          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="hidden items-center gap-2 rounded-lg p-1 pr-2 transition-colors hover:bg-surface-2 md:flex"
                  aria-label={`Account menu for ${user?.name || "you"}`}
                >
                  <Avatar name={user?.name || "User"} size="sm" />
                  <span className="max-w-32 truncate text-sm font-medium">{user?.name || "Account"}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-60">
                <DropdownMenuLabel className="space-y-0.5">
                  <span className="block truncate text-sm font-semibold text-foreground">{user?.name}</span>
                  <span className="block truncate font-normal">{user?.email}</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to={accountTarget}>
                    {verified ? <LayoutDashboard aria-hidden="true" /> : <ShieldCheck aria-hidden="true" />}
                    {accountLabel}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem tone="critical" onSelect={handleLogout}>
                  <LogOut aria-hidden="true" /> Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild size="sm" className="hidden md:inline-flex">
              <Link to="/login">Sign in</Link>
            </Button>
          )}
          <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu" onClick={() => setMenuOpen(true)}>
            <Menu />
          </Button>
        </div>
      </div>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="right" title="Menu">
          <nav aria-label="Main" className="flex flex-col gap-1 p-3">
            {NAV_ITEMS.map((item) => (
              <HashLink
                key={item.name}
                smooth
                to={item.href}
                onClick={() => setMenuOpen(false)}
                className="rounded-lg px-3 py-3 text-base font-medium text-foreground hover:bg-surface-2"
              >
                {item.name}
              </HashLink>
            ))}
          </nav>
          <div className="space-y-2 border-t border-border p-4">
            {isAuthenticated ? (
              <>
                <div className="flex items-center gap-3 pb-2">
                  <Avatar name={user?.name || "User"} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{user?.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                </div>
                <Button asChild className="w-full" onClick={() => setMenuOpen(false)}>
                  <Link to={accountTarget}>{accountLabel}</Link>
                </Button>
                <Button variant="outline" className="w-full" onClick={handleLogout}>
                  <LogOut aria-hidden="true" /> Log out
                </Button>
              </>
            ) : (
              <>
                <Button asChild className="w-full" onClick={() => setMenuOpen(false)}>
                  <Link to="/login">Sign in</Link>
                </Button>
                <Button asChild variant="outline" className="w-full" onClick={() => setMenuOpen(false)}>
                  <Link to="/create-acc">Create an account</Link>
                </Button>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
};
