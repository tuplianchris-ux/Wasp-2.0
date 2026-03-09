import { useEffect, useContext, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../App";
import { toast } from "sonner";

export default function AuthCallback() {
  const { processOAuthCode } = useContext(AuthContext);
  const navigate = useNavigate();
  const processed = useRef(false);

  useEffect(() => {
    const handleCallback = async () => {
      if (processed.current) return;
      processed.current = true;

      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");

      if (code) {
        try {
          await processOAuthCode(code);
          sessionStorage.setItem("just_authenticated", "true");
          toast.success("Welcome!");
          window.history.replaceState({}, document.title, "/dashboard");
          navigate("/dashboard", { replace: true });
        } catch (error) {
          const detail = error?.response?.data?.detail;
          const message =
            (typeof detail === "object" ? detail?.message : detail) ||
            error?.message ||
            "Authentication failed";
          toast.error(message);
          navigate("/auth", { replace: true });
        }
      } else {
        navigate("/auth", { replace: true });
      }
    };

    handleCallback();
  }, [navigate, processOAuthCode]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-muted-foreground">Completing sign in...</p>
      </div>
    </div>
  );
}
