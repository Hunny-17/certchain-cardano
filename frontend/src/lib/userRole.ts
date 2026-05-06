// ============================================================================
// userRole.ts
// ----------------------------------------------------------------------------
// V1 lightweight role context using localStorage. NO real authentication.
// V2 will replace with CIP-30 wallet signature auth.
//
// Purpose: give judges/testers a sense of role-aware navigation without
// building auth infrastructure that would contradict the pitch's
// "no traditional backend" thesis.
// ============================================================================

export type UserRole = "university" | "student" | "employer";

export interface RoleProfile {
  role: UserRole;
  displayName: string;
  identityLabel: string; // shown in role badge
}

const STORAGE_KEY = "certchain:userRole";

// Default mock identities — V2 will be wallet addresses + verified institution data
const ROLE_PROFILES: Record<UserRole, RoleProfile> = {
  university: {
    role: "university",
    displayName: "University",
    identityLabel: "Văn Hiến University",
  },
  student: {
    role: "student",
    displayName: "Student",
    identityLabel: "Trần Quốc Huy",
  },
  employer: {
    role: "employer",
    displayName: "Employer",
    identityLabel: "Demo Employer",
  },
};

export function setUserRole(role: UserRole): void {
  try {
    localStorage.setItem(STORAGE_KEY, role);
  } catch (e) {
    console.warn("[userRole] failed to persist role:", e);
  }
}

export function getUserRole(): UserRole | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === "university" || raw === "student" || raw === "employer") {
      return raw;
    }
    return null;
  } catch {
    return null;
  }
}

export function clearUserRole(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function getRoleProfile(role: UserRole): RoleProfile {
  return ROLE_PROFILES[role];
}

/**
 * Returns the route a given role should land on.
 */
export function getRoleHomeRoute(role: UserRole): string {
  switch (role) {
    case "university":
      return "/issue";
    case "student":
      return "/holder";
    case "employer":
      return "/verify";
  }
}