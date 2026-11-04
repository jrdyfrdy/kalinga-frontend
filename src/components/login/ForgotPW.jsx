import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, MailCheck } from "lucide-react";
import authService from "@/services/authService";
import AuthLayout from "@/layouts/AuthLayout";
import { Button, Callout, Field, Input } from "@/components/ui";

export const ForgotPW = () => {
  const [email, setEmail] = useState("");
  const [state, setState] = useState({ status: "idle", message: "" });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setState({ status: "loading", message: "" });
    try {
      const data = await authService.forgotPassword(email);
      setState({ status: "sent", message: data?.message });
    } catch (err) {
      setState({
        status: "error",
        message: err?.response?.data?.message || "We couldn't send the link. Check your connection and try again.",
      });
    }
  };

  const backToSignIn = (
    <Link to="/login" className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">
      <ArrowLeft className="size-4" aria-hidden="true" /> Back to sign in
    </Link>
  );

  if (state.status === "sent") {
    return (
      <AuthLayout footer={backToSignIn}>
        <div className="space-y-4 text-center">
          <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary-subtle text-primary">
            <MailCheck className="size-7" aria-hidden="true" />
          </span>
          <h1 className="text-2xl font-bold tracking-tight">Check your email</h1>
          <p className="text-sm text-muted-foreground">
            {state.message || "If an account exists for that email, a reset link is on its way."} The link expires in
            60 minutes.
          </p>
          <Button variant="outline" className="w-full" onClick={() => setState({ status: "idle", message: "" })}>
            Use a different email
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Reset your password"
      description="Enter the email you registered with and we'll send you a reset link."
      footer={backToSignIn}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {state.status === "error" && <Callout tone="critical">{state.message}</Callout>}
        <Field label="Email" required>
          <Input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={state.status === "loading"}>
          Send reset link
        </Button>
      </form>
    </AuthLayout>
  );
};
