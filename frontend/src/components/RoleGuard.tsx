import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  type UserRole,
  getUserRole,
  getRoleProfile,
  getRoleHomeRoute,
  setUserRole,
} from "../lib/userRole";

// ============================================================================
// RoleGuard — protect routes by user role.
// ----------------------------------------------------------------------------
// Behavior:
//   - User has matching role → render children.
//   - User has wrong role → block + show "Access restricted" screen
//     with options to switch role.
//   - No role chosen (anonymous) → render children but show warning banner
//     (V1 lite, V2 will enforce strict wallet-based auth).
// ============================================================================

interface RoleGuardProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
}

export default function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [role, setRole] = useState<UserRole | null | undefined>(undefined);

  useEffect(() => {
    setRole(getUserRole());
  }, [location.pathname]);

  // Loading state — avoid flash
  if (role === undefined) {
    return null;
  }

  // No role — anonymous mode, allow access with warning
  if (role === null) {
    return (
      <>
        <AnonymousBanner allowedRoles={allowedRoles} />
        {children}
      </>
    );
  }

  // Role matches — render
  if (allowedRoles.includes(role)) {
    return <>{children}</>;
  }

  // Role mismatch — block
  return <AccessRestricted currentRole={role} allowedRoles={allowedRoles} />;
}

// ============================================================================
// Banner — anonymous user warning
// ============================================================================
function AnonymousBanner({ allowedRoles }: { allowedRoles: UserRole[] }) {
  const navigate = useNavigate();
  const primaryRole = allowedRoles[0]; // suggest first allowed role

  const handlePickRole = () => {
    setUserRole(primaryRole);
    // Stay on current page — just adopt the role
    window.location.reload();
  };

  return (
    <div
      className="border-b-2 border-black px-4 md:px-6 py-3"
      style={{ background: "#FFF4D6" }}
    >
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div className="flex items-center gap-3">
          <span
            className="w-2 h-2 inline-block shrink-0"
            style={{ background: "#B8860B" }}
          />
          <div className="font-mono text-[10px] uppercase tracking-[0.15em]">
            <span className="font-medium">Anonymous mode</span>
            <span className="text-black/60 hidden sm:inline ml-2">
              · No role selected — V1 demo mode
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4 font-mono text-[10px] uppercase tracking-[0.15em]">
          <button
            onClick={handlePickRole}
            className="underline underline-offset-4 hover:text-[#0033AD]"
          >
            → Continue as {getRoleProfile(primaryRole).displayName}
          </button>
          <button
            onClick={() => navigate("/")}
            className="text-black/60 hover:text-black"
          >
            Pick role ↑
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Access restricted — wrong role
// ============================================================================
function AccessRestricted({
  currentRole,
  allowedRoles,
}: {
  currentRole: UserRole;
  allowedRoles: UserRole[];
}) {
  const navigate = useNavigate();
  const currentProfile = getRoleProfile(currentRole);

  const handleSwitch = (newRole: UserRole) => {
    setUserRole(newRole);
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-[#FAFAF7] text-black flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-2xl">
        <div className="flex items-baseline gap-4 mb-6">
          <span className="text-[10px] uppercase tracking-[0.25em] text-[#C53030]">
            ✕ Access restricted
          </span>
          <span className="h-px flex-1 bg-black/20" />
        </div>

        <h1
          className="text-4xl md:text-6xl leading-[0.95] mb-6 break-words"
          style={{ fontFamily: "'Instrument Serif', serif" }}
        >
          Wrong role for
          <br />
          <em className="italic text-[#0033AD]">this page</em>.
        </h1>

        <p className="text-sm md:text-base text-black/70 leading-relaxed mb-8 max-w-xl">
          You're acting as{" "}
          <span className="font-medium">{currentProfile.displayName}</span>, but
          this page requires{" "}
          <span className="font-medium">
            {allowedRoles.map((r) => getRoleProfile(r).displayName).join(" or ")}
          </span>
          . Switch role to continue, or return to a page you can access.
        </p>

        <div className="border-2 border-black bg-white p-5 md:p-6 mb-6">
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-black/50 mb-4">
            Switch to a permitted role
          </div>
          <div className="space-y-2">
            {allowedRoles.map((r) => (
              <button
                key={r}
                onClick={() => handleSwitch(r)}
                className="w-full text-left border-2 border-black p-4 hover:bg-black hover:text-[#FAFAF7] transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div
                      className="text-lg"
                      style={{ fontFamily: "'Instrument Serif', serif" }}
                    >
                      Switch to {getRoleProfile(r).displayName}
                    </div>
                    <div className="text-[10px] uppercase tracking-[0.15em] opacity-70 mt-1">
                      {getRoleProfile(r).identityLabel}
                    </div>
                  </div>
                  <span className="font-mono text-xs">→</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => navigate(getRoleHomeRoute(currentRole))}
            className="flex-1 border-2 border-black px-5 py-4 hover:bg-black hover:text-[#FAFAF7] transition-colors"
          >
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-black/60 mb-1">
              Or
            </div>
            <div
              className="text-base flex items-center justify-between"
              style={{ fontFamily: "'Instrument Serif', serif" }}
            >
              <span>← Back to {currentProfile.displayName} home</span>
            </div>
          </button>
          <button
            onClick={() => navigate("/")}
            className="flex-1 border-2 border-black px-5 py-4 hover:bg-[#0033AD] hover:text-white hover:border-[#0033AD] transition-colors"
          >
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-black/60 mb-1 group-hover:text-white/70">
              Restart
            </div>
            <div
              className="text-base flex items-center justify-between"
              style={{ fontFamily: "'Instrument Serif', serif" }}
            >
              <span>↑ Back to landing</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}