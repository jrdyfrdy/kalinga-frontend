import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import AuthLayout from "@/layouts/AuthLayout";
import { Button, Field, Input } from "@/components/ui";
import { useAuth } from "../../context/AuthContext";
import {
  navigateToRoleBasedRoute,
  getPostAuthDescription,
} from "../../utils/roleRouting";

export default function CreateAcc() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { register } = useAuth();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
  });
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const isPasswordStrong = (pwd) => {
    const minLength = /.{8,}/;
    const hasLetters = /[A-Za-z]/;
    const hasNumbers = /[0-9]/;
    return minLength.test(pwd) && hasLetters.test(pwd) && hasNumbers.test(pwd);
  };

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [id]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isPasswordStrong(password)) {
      setError(
        "Password must be at least 8 characters long and contain letters and numbers."
      );
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match!");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      // Register user with backend API
      const data = await register({
        name: formData.name,
        email: formData.email,
        password: password,
        password_confirmation: confirmPassword,
        role: "patient", // Default role for self-registration
        phone: formData.phone || null,
      });

      // Show success toast
      const description = getPostAuthDescription(data.user.role, data.user);
      toast({
        title: "Account created!",
        description: `Welcome, ${data.user.name}! ${description}`,
        className:
          "flex flex-col items-center text-center justify-center w-full",
      });

      // User is now automatically logged in (AuthContext handles this)
      // Redirect based on role using centralized routing
      navigateToRoleBasedRoute(data.user, navigate, { delay: 1500 });
    } catch (error) {
      console.error("Registration error:", error);

      // Handle specific error messages
      let errorMessage = "Registration failed. Please try again.";

      if (error.response?.data?.errors) {
        // Laravel validation errors
        const errors = error.response.data.errors;
        errorMessage = Object.values(errors).flat().join(" ");
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      setError(errorMessage);
      toast({
        title: "Registration Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmPasswordChange = (e) => {
    const value = e.target.value;
    setConfirmPassword(value);
    if (password && value && password !== value) {
      setError("Passwords do not match!");
    } else {
      setError("");
    }
  };

  const passwordWeak = password.length > 0 && !isPasswordStrong(password);
  const PasswordToggle = ({ shown, onToggle }) => (
    <button
      type="button"
      onClick={onToggle}
      className="absolute right-1 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
      aria-label={shown ? "Hide password" : "Show password"}
    >
      {shown ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
    </button>
  );

  return (
    <AuthLayout
      title="Create your account"
      description="Sign up as a patient. You'll verify your identity in the next step."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Full name" required>
          <Input id="name" value={formData.name} onChange={handleInputChange} autoComplete="name" placeholder="Juan Dela Cruz" />
        </Field>
        <Field label="Email" required>
          <Input id="email" type="email" value={formData.email} onChange={handleInputChange} autoComplete="email" placeholder="juan.delacruz@example.com" />
        </Field>
        <Field label="Phone number" hint="Optional. Responders may call this number during an emergency.">
          <Input id="phone" type="tel" value={formData.phone} onChange={handleInputChange} autoComplete="tel" placeholder="09171234567" />
        </Field>
        <Field
          label="Password"
          hint="At least 8 characters, with letters and numbers."
          error={passwordWeak ? "Use at least 8 characters with both letters and numbers." : undefined}
          required
        >
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              aria-invalid={passwordWeak || undefined}
              className="pr-10"
            />
            <PasswordToggle shown={showPassword} onToggle={() => setShowPassword(!showPassword)} />
          </div>
        </Field>
        <Field label="Confirm password" error={error || undefined} required>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={handleConfirmPasswordChange}
              autoComplete="new-password"
              aria-invalid={!!error || undefined}
              className="pr-10"
            />
            <PasswordToggle shown={showConfirmPassword} onToggle={() => setShowConfirmPassword(!showConfirmPassword)} />
          </div>
        </Field>
        <Button
          type="submit"
          size="lg"
          className="w-full"
          loading={isSubmitting}
          disabled={!password || !confirmPassword || !!error || !isPasswordStrong(password)}
        >
          {isSubmitting ? "Creating account…" : "Create account"}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          By creating an account you agree to the{" "}
          <Link to="/terms-and-conditions" className="underline hover:text-foreground">
            terms
          </Link>{" "}
          and{" "}
          <Link to="/privacy-policy" className="underline hover:text-foreground">
            privacy policy
          </Link>
          .
        </p>
      </form>
    </AuthLayout>
  );
}
