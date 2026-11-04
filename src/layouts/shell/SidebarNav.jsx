import { Link, useLocation } from "react-router-dom";
import { isNavItemActive } from "@/config/navigation";
import { Tooltip } from "@/components/ui";
import { cn } from "@/lib/utils";

function NavItem({ item, collapsed, onNavigate }) {
  const { pathname } = useLocation();
  const active = isNavItemActive(item, pathname);
  const Icon = item.icon;
  const critical = item.tone === "critical";

  const link = (
    <Link
      to={item.to}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
        collapsed && "justify-center px-0",
        active
          ? "bg-sidebar-active text-sidebar-foreground"
          : "text-sidebar-muted hover:bg-sidebar-active hover:text-sidebar-foreground",
        critical && !active && "text-red-200 hover:text-white",
        critical && active && "bg-critical text-critical-foreground",
      )}
    >
      {active && !critical && (
        <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-accent" aria-hidden="true" />
      )}
      <Icon className={cn("size-[1.125rem] shrink-0", critical && !active && "text-red-300")} aria-hidden="true" />
      <span className={cn("truncate", collapsed && "sr-only")}>{item.label}</span>
      {item.badge && !collapsed && (
        <span className="ml-auto rounded-full bg-critical px-1.5 py-0.5 text-[0.625rem] font-bold text-critical-foreground">
          {item.badge}
        </span>
      )}
    </Link>
  );

  return <li>{collapsed ? <Tooltip content={item.label} side="right">{link}</Tooltip> : link}</li>;
}

/** Grouped vertical navigation used by the desktop sidebar and the mobile drawer. */
export function SidebarNav({ groups, account, collapsed = false, onNavigate, flags = {} }) {
  const visible = (item) => !item.requires || flags[item.requires];
  return (
    <nav aria-label="Main" className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 py-2">
      {groups.map((group, index) => {
        const items = group.items.filter(visible);
        if (items.length === 0) return null;
        return (
          <div key={group.label || index} className="space-y-1">
            {group.label &&
              (collapsed ? (
                <div className="mx-3 my-2 h-px bg-sidebar-border" aria-hidden="true" />
              ) : (
                <p className="px-3 pb-1 text-[0.6875rem] font-semibold uppercase tracking-wider text-sidebar-muted/80">
                  {group.label}
                </p>
              ))}
            <ul className="space-y-0.5">
              {items.map((item) => (
                <NavItem key={item.to + item.label} item={item} collapsed={collapsed} onNavigate={onNavigate} />
              ))}
            </ul>
          </div>
        );
      })}
      {account?.length > 0 && (
        <ul className="mt-auto space-y-0.5 border-t border-sidebar-border pt-3">
          {account.map((item) => (
            <NavItem key={item.to} item={item} collapsed={collapsed} onNavigate={onNavigate} />
          ))}
        </ul>
      )}
    </nav>
  );
}
