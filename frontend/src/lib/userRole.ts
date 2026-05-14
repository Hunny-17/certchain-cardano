// ============================================================================
// userRole.ts
// ----------------------------------------------------------------------------
// V1 lightweight role context using localStorage. NO real authentication.
// V2 will replace with CIP-30 wallet signature auth.
//
// Purpose: give judges/testers a sense of role-aware navigation without
// building auth infrastructure that would contradict the pitch's
// "no traditional backend" thesis.
//
// CHANGELOG (V2 Day 3):
//   - setUserRole + clearUserRole now dispatch ROLE_CHANGE_EVENT
//   - Enables useUserRole hook to react to in-tab role changes
//   - Without this, components mounted before role change keep stale state
// ============================================================================
export type UserRole = "university" | "student" | "employer";
export interface RoleProfile {
  role: UserRole;
  displayName: string;
  identityLabel: string; // shown in role badge
}

const STORAGE_KEY = "certchain:userRole";
// Exported so useUserRole hook can subscribe to it
export const ROLE_CHANGE_EVENT = "certchain:roleChange";

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
    // Fire in-tab event so useUserRole hook listeners re-render
    // (browser 'storage' event only fires cross-tab, not in same tab)
    window.dispatchEvent(
      new CustomEvent(ROLE_CHANGE_EVENT, { detail: role })
    );
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
    window.dispatchEvent(
      new CustomEvent(ROLE_CHANGE_EVENT, { detail: null })
    );
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