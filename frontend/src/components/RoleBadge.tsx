import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  type UserRole,
  getRoleProfile,
  setUserRole,
  clearUserRole,
  getRoleHomeRoute,
} from "../lib/userRole";

// ============================================================================
// RoleBadge — small contextual chip indicating which role the user is acting as.
// Shown on /issue, /holder, /verify when a role has been chosen via Landing.
// Clicking opens a switcher modal.
// ============================================================================

export default function RoleBadge({ role }: { role: UserRole | null }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  if (!role) return null;
  const profile = getRoleProfile(role);

  const switchTo = (newRole: UserRole) => {
    setUserRole(newRole);
    setOpen(false);
    navigate(getRoleHomeRoute(newRole));
  };

  const exitRole = () => {
    clearUserRole();
    setOpen(false);
    navigate("/");
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed top-20 right-4 md:right-6 z-30 group flex items-center gap-2 border-2 border-black bg-[#FAFAF7] px-3 py-2 hover:bg-black hover:text-[#FAFAF7] transition-colors shadow-sm"
        title="Switch role"
      >
        <span
          className="w-2 h-2 inline-block shrink-0"
          style={{ background: "#0033AD" }}
        />
        <span className="font-mono text-[9px] md:text-[10px] uppercase tracking-[0.15em] flex flex-col md:flex-row md:items-center md:gap-2">
          <span className="opacity-60 group-hover:opacity-80">Acting as</span>
          <span>{profile.displayName}</span>
          <span className="hidden md:inline opacity-60">·</span>
          <span className="hidden md:inline opacity-80">
            {profile.identityLabel}
          </span>
        </span>
        <span className="font-mono text-[10px] opacity-50 group-hover:opacity-100">
          ⇄
        </span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-[#FAFAF7] border-2 border-black w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b-2 border-black px-5 py-4 flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em]">
                Switch role
              </span>
              <button
                onClick={() => setOpen(false)}
                className="font-mono text-sm hover:text-[#0033AD]"
              >
                ✕
              </button>
            </div>

            <div className="p-5">
              <p className="text-xs text-black/60 leading-relaxed mb-5">
                V1 lite — role is stored locally to demo audience-aware UX.
                Real wallet-based authentication arrives in V2 with CIP-30.
              </p>

              <div className="space-y-2 mb-5">
                <RoleOption
                  current={role === "university"}
                  onClick={() => switchTo("university")}
                  title="University"
                  sub="Issue credentials on-chain"
                />
                <RoleOption
                  current={role === "student"}
                  onClick={() => switchTo("student")}
                  title="Student"
                  sub="Hold and share credentials"
                />
                <RoleOption
                  current={role === "employer"}
                  onClick={() => switchTo("employer")}
                  title="Employer"
                  sub="Verify candidate credentials"
                />
              </div>

              <button
                onClick={exitRole}
                className="w-full text-[10px] uppercase tracking-[0.2em] text-black/60 hover:text-[#0033AD] underline underline-offset-4 py-2"
              >
                ← Exit role · Back to landing
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function RoleOption({
  current,
  onClick,
  title,
  sub,
}: {
  current: boolean;
  onClick: () => void;
  title: string;
  sub: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={current}
      className={`w-full text-left border-2 border-black p-4 transition-colors ${
        current
          ? "bg-[#0033AD] text-white cursor-default"
          : "hover:bg-black hover:text-[#FAFAF7]"
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <div
            className="text-lg"
            style={{ fontFamily: "'Instrument Serif', serif" }}
          >
            {title}
          </div>
          <div className="text-[10px] uppercase tracking-[0.15em] opacity-70 mt-1">
            {sub}
          </div>
        </div>
        <div className="font-mono text-xs opacity-70">
          {current ? "✓ Current" : "→"}
        </div>
      </div>
    </button>
  );
}