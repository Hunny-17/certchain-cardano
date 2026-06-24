// ============================================================================
// useUserRole.ts
// ----------------------------------------------------------------------------
// React hook to subscribe to userRole changes.
//
// Auto-re-renders when:
//   1. setUserRole() is called anywhere in the app (in-tab)
//      → via custom ROLE_CHANGE_EVENT dispatched by setUserRole
//   2. User changes role in another tab (cross-tab)
//      → via native 'storage' event
//
// Usage:
//   const role = useUserRole();    // returns UserRole | null, auto-updates
//
// Replaces the pattern:
//   const [role, setRole] = useState<UserRole | null>(null);
//   useEffect(() => { setRole(getUserRole()); }, []);
//   // ↑ This was buggy: only ran once on mount, missed later role changes
// ============================================================================
import { useState, useEffect } from "react";
import {
  getUserRole,
  ROLE_CHANGE_EVENT,
  type UserRole,
} from "./userRole";

export function useUserRole(): UserRole | null {
  // Lazy initial state — read localStorage only once on first render
  const [role, setRole] = useState<UserRole | null>(() => getUserRole());

  useEffect(() => {
    // In-tab role changes (e.g. user clicks Switch button in RoleBadge)
    const handleRoleChange = () => {
      setRole(getUserRole());
    };

    // Cross-tab role changes (e.g. user changes role in another browser tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "certchain:userRole") {
        setRole(getUserRole());
      }
    };

    window.addEventListener(ROLE_CHANGE_EVENT, handleRoleChange);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener(ROLE_CHANGE_EVENT, handleRoleChange);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  return role;
}
