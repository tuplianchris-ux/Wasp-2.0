import React, { useEffect } from "react";
import { useNavigate } from "react-router";
import type { AuthUser } from "wasp/auth";

export function RootPage({ user }: { user: AuthUser }) {
  const navigate = useNavigate();

  useEffect(() => {
    if ((user as any).role === "TEACHER") {
      navigate("/teacher/dashboard", { replace: true });
    } else {
      navigate("/student/dashboard", { replace: true });
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );
}
