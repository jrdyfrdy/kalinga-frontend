import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import authService from "@/services/authService";
import AuthLayout from "@/layouts/AuthLayout";
import { Button, Callout, Field, Input } from "@/components/ui";
import { notify } from "@/lib/notify";

/** Landing page for the emailed password-reset link (?token=…&email=…). */
export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token") || "";
  const email = params.get("email") || "";
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const mismatch = confirmation.length > 0 && password !== confirmation;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (password.length < 8) return setError("Use at least 8 characters.");
    if (mismatch) return setError("The passwords don't match.");
    setSubmitting(true);
    setError("");
    try {
      await authService.resetPassword({ token, email, password, password_confirmation: confirmation });
      notify.success("Password updated", "Sign in with your new password.");
      navigate("/login", { replace: true });
    } catch (err) {
      setError(err?.response?.data?.message || "We couldn't reset your password. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!token || !email) {
    return (
      <AuthLayout
        title="Reset link is incomplete"
        description="Open the link from your email again, or request a new one."
        footer={
          <Link to="/forgot-password" className="font-semibold text-primary hover:underline">
            Request a new link
          </Link>
        }
      />
    );
  }

  return (
    <AuthLayout
      title="Choose a new password"
      description={`For ${email}`}
      footer={
        <Link to="/login" className="font-semibold text-primary hover:underline">
          Back to sign in
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Callout tone="critical">{error}</Callout>}
        <Field label="New password" hint="At least 8 characters." required>
          <Input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
        </Field>
        <Field label="Confirm new password" error={mismatch ? "The passwords don't match." : undefined} required>
          <Input type="password" autoComplete="new-password" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} />
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={submitting}>
          Update password
        </Button>
      </form>
    </AuthLayout>
  );
}
