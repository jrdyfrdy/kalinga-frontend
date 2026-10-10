import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";
import authService from "@/services/authService";
import api from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { getDefaultRouteForRole } from "@/utils/roleRouting";

export const MagicLogin = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setSession } = useAuth();
  const { toast } = useToast();
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const processLogin = async () => {
      const token = searchParams.get("token");

      if (!token) {
        navigate("/login", { replace: true });
        return;
      }

      // Immediately strip the token from the browser's address bar to prevent visual leaks
      window.history.replaceState({}, document.title, window.location.pathname);

      try {
        // The emailed token is short-lived (30 min). Use it once to exchange
        // for a regular session token; the api interceptor attaches whatever
        // is in localStorage, so no axios default headers are needed.
        localStorage.setItem("token", token);
        const { data } = await api.post("/magic-login/exchange");
        const sessionToken = data?.token;
        if (!sessionToken) {
          throw new Error("Magic link exchange did not return a token");
        }
        localStorage.setItem("token", sessionToken);

        const userData = data?.user ?? (await authService.getCurrentUser());
        setSession(userData, sessionToken);

        // Redirect based on the verified role from the API (not the URL param, which is user-controlled)
        navigate(getDefaultRouteForRole(userData?.role, userData), {
          replace: true,
        });
      } catch (error) {
        console.error("Magic login failed", error);

        // Clean up the invalid token so it doesn't break future normal logins
        localStorage.removeItem("token");

        toast({
          variant: "destructive",
          title: "Login Failed",
          description:
            "This login link has expired or is invalid. Please log in manually.",
        });

        navigate("/login", { replace: true });
      }
    };

    processLogin();
  }, [navigate, searchParams, setSession, toast]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-green-700" />
        <p className="text-lg font-medium text-gray-700">
          Authenticating your secure link...
        </p>
      </div>
    </div>
  );
};
