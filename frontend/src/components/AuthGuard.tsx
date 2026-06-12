import { useEffect, type ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

interface AuthGuardProps {
  children: ReactNode;
  requireRole?: "admin" | "issuer";
}

export default function AuthGuard({ children, requireRole }: AuthGuardProps) {
  const { loading, user, university, role } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      navigate("/login", { state: { from: location.pathname }, replace: true });
      return;
    }

    if (!university?.verified) {
      navigate("/pending-verification", { replace: true });
      return;
    }

    if (requireRole && role !== "admin" && role !== requireRole) {
      navigate("/unauthorized", { replace: true });
    }
  }, [loading, user, university, role, requireRole, navigate, location.pathname]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center">
        <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-black/50">
          ⟳ Checking credentials...
        </div>
      </div>
    );
  }

  if (!user || !university?.verified) return null;
  if (requireRole && role !== "admin" && role !== requireRole) return null;

  return <>{children}</>;
}
