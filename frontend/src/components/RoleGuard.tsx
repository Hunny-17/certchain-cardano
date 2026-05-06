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
  const navigate = useNavigate()
  const primaryRole = allowedRoles[0]
  const profile = getRoleProfile(primaryRole)

  const handleAdopt = () => {
    setUserRole(primaryRole)
    navigate(getRoleHomeRoute(primaryRole))
  }

  return (
    <div className="min-h-screen bg-[#FAFAF7] text-black flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-2xl">
        <div className="flex items-baseline gap-4 mb-6">
          <span className="text-[10px] uppercase tracking-[0.25em] text-black/50">
            ⏸ Role required
          </span>
          <span className="h-px flex-1 bg-black/20" />
        </div>

        <h1
          className="text-4xl md:text-6xl leading-[0.95] mb-6 break-words"
          style={{ fontFamily: "'Instrument Serif', serif" }}
        >
          This page is for
          <br />
          <em className="italic text-[#0033AD]">{profile.displayName}s</em>.
        </h1>

        <p className="text-sm md:text-base text-black/70 leading-relaxed mb-10 max-w-xl">
          You haven't picked a role yet. Pick a role to continue — your choice
          is saved locally, you won't be asked again on this device.
        </p>

        <div className="border-2 border-black bg-white p-5 md:p-6 mb-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-black/50 mb-4">
            Continue as
          </div>
          <button
            onClick={handleAdopt}
            className="w-full text-left p-4 border-2 border-black hover:bg-black hover:text-[#FAFAF7] transition-colors group"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xl" style={{ fontFamily: "'Instrument Serif', serif" }}>
                  {profile.displayName}
                </div>
                <div className="text-[10px] uppercase tracking-[0.15em] opacity-70 mt-1">
                  {profile.identityLabel}
                </div>
              </div>
              <span className="text-2xl group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => navigate("/")}
            className="flex-1 border-2 border-black px-5 py-4 hover:bg-black hover:text-[#FAFAF7] transition-colors"
          >
            <div className="text-[10px] uppercase tracking-[0.2em] text-black/60 mb-1">
              Or
            </div>
            <div className="text-base" style={{ fontFamily: "'Instrument Serif', serif" }}>
              ↑ Back to landing · pick a different role
            </div>
          </button>
        </div>
      </div>
    </div>
  )
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
    navigate(getRoleHomeRoute(newRole));
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