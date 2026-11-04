import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Clock, FileUp, LogOut, RefreshCw, XCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import PublicLayout from "@/layouts/PublicLayout";
import { getDefaultRouteForRole } from "../utils/roleRouting";
import { Badge, Button, Card } from "@/components/ui";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import api from "../services/api";

const STATUS = {
  verified: {
    icon: CheckCircle2,
    tone: "success",
    title: "Your account is verified",
    message: "You now have access to every Kalinga feature.",
    action: "Go to dashboard",
  },
  rejected: {
    icon: XCircle,
    tone: "critical",
    title: "Verification was not approved",
    message: "Review the feedback sent to your email, then resubmit your documents.",
    action: "Resubmit verification",
    route: "/verify-id",
  },
  none: {
    icon: FileUp,
    tone: "info",
    title: "No verification submitted",
    message: "Upload a valid ID to activate your account.",
    action: "Upload ID",
    route: "/verify-id",
  },
  pending: {
    icon: Clock,
    tone: "warning",
    title: "Verification in review",
    message: "Our team is reviewing your documents. This usually takes 24–48 hours.",
    action: "Check status",
  },
};

const ICON_TONES = {
  success: "bg-success-subtle text-success",
  critical: "bg-critical-subtle text-critical",
  info: "bg-info-subtle text-info",
  warning: "bg-warning-subtle text-warning-subtle-foreground",
};

export default function VerificationPending() {
  const { user, logout, setUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const key = user?.verification_status == null ? "none" : STATUS[user.verification_status] ? user.verification_status : "pending";
  const status = STATUS[key];
  const Icon = status.icon;

  const handleAction = async () => {
    if (key === "verified") return navigate(getDefaultRouteForRole(user?.role, user));
    if (status.route) return navigate(status.route);

    setLoading(true);
    try {
      const response = await api.get("/me");
      setUser(response.data);
      localStorage.setItem("user", JSON.stringify(response.data));
      if (response.data.verification_status === "pending") {
        notify.info("Still in review", "We'll email you as soon as your account is approved.");
      }
    } catch (error) {
      notify.error("Couldn't refresh your status", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      window.location.assign("/#hero");
    }
  };

  return (
    <PublicLayout>
      <div className="flex justify-center px-4 py-16">
        <Card className="w-full max-w-md p-8">
          <div className="flex flex-col items-center text-center">
            <span className={cn("mb-4 flex size-14 items-center justify-center rounded-full", ICON_TONES[status.tone])}>
              <Icon className="size-7" aria-hidden="true" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight">{status.title}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{status.message}</p>
          </div>

          <dl className="mt-6 space-y-2 rounded-lg border border-border bg-surface-2/60 p-4 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Name</dt>
              <dd className="truncate font-medium">{user?.name || "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Email</dt>
              <dd className="truncate font-medium">{user?.email || "—"}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Status</dt>
              <dd>
                <Badge tone={status.tone} dot>
                  {key === "none" ? "Not submitted" : key.charAt(0).toUpperCase() + key.slice(1)}
                </Badge>
              </dd>
            </div>
          </dl>

          <div className="mt-6 space-y-2">
            <Button className="w-full" size="lg" onClick={handleAction} loading={loading}>
              {!loading && key === "pending" && <RefreshCw aria-hidden="true" />}
              {loading ? "Checking…" : status.action}
            </Button>
            <Button variant="ghost" className="w-full" onClick={handleLogout}>
              <LogOut aria-hidden="true" /> Log out
            </Button>
          </div>

          {key === "pending" && (
            <div className="mt-6 border-t border-border pt-4 text-sm text-muted-foreground">
              <p className="mb-2 font-medium text-foreground">What happens next</p>
              <ol className="list-inside list-decimal space-y-1">
                <li>An admin reviews your documents.</li>
                <li>You get an email with a one-tap sign-in link.</li>
                <li>Your dashboard unlocks automatically.</li>
              </ol>
            </div>
          )}
        </Card>
      </div>
    </PublicLayout>
  );
}
