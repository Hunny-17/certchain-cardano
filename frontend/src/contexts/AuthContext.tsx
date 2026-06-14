import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

interface University {
  id: string;
  name: string;
  name_vi: string | null;
  domain: string | null;
  verified: boolean;
}

type Role = "admin" | "issuer" | "viewer";

interface AuthState {
  loading: boolean;
  user: User | null;
  session: Session | null;
  university: University | null;
  role: Role | null;
}

interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function loadMembership(
  userId: string
): Promise<{ university: University; role: Role } | null> {
  const { data } = await supabase
    .from("university_members")
    .select(
      "role, universities!inner(id, name, name_vi, domain, verified)"
    )
    .eq("user_id", userId)
    .single();

  if (!data) return null;

  return {
    university: (data as any).universities as University,
    role: data.role as Role,
  };
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    loading: true,
    user: null,
    session: null,
    university: null,
    role: null,
  });

  useEffect(() => {
    let cancelled = false;
    const done = (s: Partial<AuthState>) => {
      if (!cancelled) setState((prev) => ({ ...prev, loading: false, ...s }));
    };

    // Fallback: force loading=false after 6s in case everything hangs
    const timeout = setTimeout(() => done({}), 6000);

    supabase.auth.getSession().then(async ({ data }) => {
      clearTimeout(timeout);
      if (data.session) {
        const membership = await loadMembership(data.session.user.id).catch(() => null);
        done({
          user: data.session.user,
          session: data.session,
          university: membership?.university ?? null,
          role: membership?.role ?? null,
        });
      } else {
        done({});
      }
    }).catch(() => {
      clearTimeout(timeout);
      done({});
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      // Run async work in a microtask so this callback returns synchronously,
      // preventing signInWithPassword from blocking on loadMembership.
      Promise.resolve().then(async () => {
        if (session) {
          const membership = await Promise.race([
            loadMembership(session.user.id),
            new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000)),
          ]).catch(() => null);
          done({
            user: session.user,
            session,
            university: membership?.university ?? null,
            role: membership?.role ?? null,
          });
        } else {
          done({ user: null, session: null, university: null, role: null });
        }
      });
    });

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ ...state, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
