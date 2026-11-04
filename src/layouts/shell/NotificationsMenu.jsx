import { Link } from "react-router-dom";
import { Bell, CheckCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import * as Popover from "@radix-ui/react-popover";
import { useNotifications } from "@/hooks/useNotifications";
import { Button, EmptyState, Skeleton } from "@/components/ui";
import { cn } from "@/lib/utils";

const timeAgo = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "";
  return formatDistanceToNow(date, { addSuffix: true });
};

export function NotificationsMenu({ seeAllTo, enabled = true }) {
  const { notifications, loading, unreadCount, markAsRead, markAllAsRead } = useNotifications({ limit: 8, enabled });
  const label = unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications";

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <Button variant="ghost" size="icon" aria-label={label} title="Notifications" className="relative">
          <Bell aria-hidden="true" />
          {unreadCount > 0 && (
            <span className="tabular absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-critical px-1 text-[0.625rem] font-bold leading-none text-critical-foreground ring-2 ring-surface">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          className="z-[1150] w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl border border-border bg-surface text-foreground shadow-lg"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-sm font-semibold">Notifications</p>
            {unreadCount > 0 && markAllAsRead && (
              <Button variant="ghost" size="sm" onClick={() => markAllAsRead()}>
                <CheckCheck aria-hidden="true" /> Mark all read
              </Button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <div className="space-y-3 p-4">
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
              </div>
            ) : notifications.length === 0 ? (
              <EmptyState compact icon={Bell} title="You're all caught up" description="New alerts appear here in real time." />
            ) : (
              <ul className="divide-y divide-border">
                {notifications.map((notif) => {
                  const unread = !notif.read_at;
                  return (
                    <li key={notif.id}>
                      <button
                        type="button"
                        onClick={() => unread && markAsRead?.(notif.id)}
                        className="flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-2"
                      >
                        <span
                          className={cn("mt-1.5 size-2 shrink-0 rounded-full", unread ? "bg-primary" : "bg-transparent")}
                          aria-hidden="true"
                        />
                        <span className="min-w-0 flex-1">
                          <span className={cn("block truncate text-sm", unread ? "font-semibold" : "font-medium")}>
                            {notif.title}
                          </span>
                          {notif.description && (
                            <span className="line-clamp-2 block text-sm text-muted-foreground">{notif.description}</span>
                          )}
                          <span className="mt-1 block text-xs text-muted-foreground">{timeAgo(notif.created_at)}</span>
                        </span>
                        {unread && <span className="sr-only">Unread</span>}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          {seeAllTo && (
            <div className="border-t border-border p-2">
              <Popover.Close asChild>
                <Button asChild variant="ghost" size="sm" className="w-full">
                  <Link to={seeAllTo}>See all notifications</Link>
                </Button>
              </Popover.Close>
            </div>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
