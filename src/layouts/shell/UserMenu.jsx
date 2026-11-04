import { useNavigate } from "react-router-dom";
import { ChevronDown, LifeBuoy, LogOut, Settings, User } from "lucide-react";
import {
  Avatar,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui";
import { ROLE_LABELS } from "@/config/navigation";

export function UserMenu({ user, role, profileTo, settingsTo, onLogout }) {
  const navigate = useNavigate();
  const name = user?.name || ROLE_LABELS[role] || "Account";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-lg p-1 pr-2 text-left transition-colors hover:bg-surface-2"
          aria-label={`Account menu for ${name}`}
        >
          <Avatar name={name} src={user?.profile_picture_url || user?.profilePicture || undefined} size="sm" />
          <span className="hidden min-w-0 md:block">
            <span className="block max-w-36 truncate text-sm font-semibold leading-tight">{name}</span>
            <span className="block text-xs leading-tight text-muted-foreground">{ROLE_LABELS[role]}</span>
          </span>
          <ChevronDown className="hidden size-4 text-muted-foreground md:block" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-60">
        <DropdownMenuLabel className="space-y-0.5">
          <span className="block truncate text-sm font-semibold text-foreground">{name}</span>
          {user?.email && <span className="block truncate font-normal">{user.email}</span>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {profileTo && (
          <DropdownMenuItem onSelect={() => navigate(profileTo)}>
            <User aria-hidden="true" /> Profile
          </DropdownMenuItem>
        )}
        {settingsTo && (
          <DropdownMenuItem onSelect={() => navigate(settingsTo)}>
            <Settings aria-hidden="true" /> Settings
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          onSelect={() => window.open("mailto:kalinga.tup@gmail.com?subject=Kalinga%20support%20request", "_blank")}
        >
          <LifeBuoy aria-hidden="true" /> Get support
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem tone="critical" onSelect={onLogout}>
          <LogOut aria-hidden="true" /> Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
