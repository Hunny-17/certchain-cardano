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
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session) {
        const membership = await loadMembership(data.session.user.id);
        setState({
          loading: false,
          user: data.session.user,
          session: data.session,
          university: membership?.university ?? null,
          role: membership?.role ?? null,
        });
      } else {
        setState((s) => ({ ...s, loading: false }));
      }
    }).catch(() => {
      setState((s) => ({ ...s, loading: false }));
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        const membership = await loadMembership(session.user.id);
        setState({
          loading: false,
          user: session.user,
          session,
          university: membership?.university ?? null,
          role: membership?.role ?? null,
        });
      } else {
        setState({
          loading: false,
          user: null,
          session: null,
          university: null,
          role: null,
        });
      }
    });

    return () => subscription.unsubscribe();
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
