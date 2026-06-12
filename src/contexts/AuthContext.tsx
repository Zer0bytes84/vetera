import type React from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { writeCachedProfile } from "@/lib/profile-cache";
import { bootstrapScheduler, stopScheduler } from "@/services/backupScheduler";
import * as AuthService from "@/services/sqlite/auth";

interface AuthUser {
  avatarUrl?: string | null;
  displayName: string | null;
  email: string | null;
  id: string;
  role?: string;
  uid: string;
}

interface AuthContextType {
  currentUser: AuthUser | null;
  error: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshCurrentUser: () => Promise<void>;
  register: (
    email: string,
    password: string,
    displayName: string
  ) => Promise<AuthUser>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const SQLITE_DATA_CHANGED_EVENT = "sqlite-data-changed";
const INITIAL_AUTH_TIMEOUT_MS = 2500;

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string
) {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error(message));
    }, timeoutMs);

    promise
      .then((value) => {
        window.clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        window.clearTimeout(timer);
        reject(error);
      });
  });
}

function isTransientDbError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();
  return lower.includes("database is locked") || lower.includes("timed out");
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasInitializedRef = useRef(false);
  const currentUserRef = useRef<AuthUser | null>(null);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  const refreshCurrentUser = useCallback(async () => {
    const isInitialLoad = !hasInitializedRef.current;
    try {
      // Only show the global loading skeleton on the very first load.
      // Background refreshes (e.g. on sqlite-data-changed) must not blank out
      // the whole app on Windows when WebView2 fires focus/visibility changes.
      if (isInitialLoad) {
        setLoading(true);
      }
      const user = isInitialLoad
        ? await withTimeout(
            AuthService.getCurrentUser(),
            INITIAL_AUTH_TIMEOUT_MS,
            "Auth initialization timed out"
          )
        : await AuthService.getCurrentUser();
      if (user) {
        setCurrentUser({
          id: user.id,
          uid: user.id,
          email: user.email,
          displayName: user.displayName,
          role: user.role,
          avatarUrl: user.avatarUrl ?? null,
        });
        writeCachedProfile(user.email, {
          displayName: user.displayName || undefined,
          avatarUrl: user.avatarUrl ?? undefined,
        });
      } else if (isInitialLoad) {
        // Only clear the user on the initial load. After bootstrap,
        // a transient null result (StrictMode double-invoke, race condition,
        // momentary DB unavailability) must NOT bump the user back to the
        // login screen — they should remain logged in until they explicitly
        // logout or their token is missing.
        setCurrentUser(null);
      } else if (!localStorage.getItem("auth_token")) {
        // No token at all → really logged out.
        setCurrentUser(null);
      }
      setError(null);
    } catch (error: any) {
      if (isTransientDbError(error)) {
        setError(null);
      } else {
        console.error("Error refreshing user:", error);
        setError(error.message || "Failed to refresh user");
      }
      // Never null out the user on a transient error after bootstrap.
    } finally {
      hasInitializedRef.current = true;
      setLoading(false);
    }
  }, []);

  // Charger l'utilisateur au démarrage
  useEffect(() => {
    const loadUser = async () => {
      try {
        await refreshCurrentUser();
        // Boot the backup scheduler once the user is resolved so the first
        // run benefits from the live DB connection.
        void bootstrapScheduler();
      } catch (error: any) {
        console.error("Error loading user:", error);
        setError(error.message || "Failed to load user");
      } finally {
        hasInitializedRef.current = true;
        setLoading(false);
      }
    };

    loadUser();

    return () => {
      stopScheduler();
    };
  }, [refreshCurrentUser]);

  useEffect(() => {
    const handleDataChanged = (event: Event) => {
      const customEvent = event as CustomEvent<{ tableName?: string }>;
      if (
        customEvent.detail?.tableName === "users" &&
        localStorage.getItem("auth_token")
      ) {
        refreshCurrentUser().catch((error) => {
          console.error("Error syncing current user:", error);
        });
      }
    };

    window.addEventListener(SQLITE_DATA_CHANGED_EVENT, handleDataChanged);
    return () =>
      window.removeEventListener(SQLITE_DATA_CHANGED_EVENT, handleDataChanged);
  }, [refreshCurrentUser]);

  const login = async (email: string, password: string) => {
    try {
      const user = await AuthService.login({ email, password });
      setCurrentUser({
        id: user.id,
        uid: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        avatarUrl: user.avatarUrl ?? null,
      });
      writeCachedProfile(user.email, {
        displayName: user.displayName || undefined,
        avatarUrl: user.avatarUrl ?? undefined,
      });
      setError(null);
      // Audit log: login (ne doit jamais casser la session)
      try {
        const { auditLogin } = await import("@/services/auditService");
        await auditLogin({
          id: user.id,
          displayName: user.displayName,
          email: user.email,
        });
      } catch {
        // silencieux
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const register = async (
    email: string,
    password: string,
    displayName: string
  ): Promise<AuthUser> => {
    const user = await AuthService.register({ email, password, displayName });
    setCurrentUser({
      id: user.id,
      uid: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      avatarUrl: user.avatarUrl ?? null,
    });
    writeCachedProfile(user.email, {
      displayName: user.displayName || undefined,
      avatarUrl: user.avatarUrl ?? undefined,
    });
    return {
      id: user.id,
      uid: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      avatarUrl: user.avatarUrl ?? null,
    };
  };

  const logout = async () => {
    const current = currentUserRef.current;
    await AuthService.logout();
    setCurrentUser(null);
    if (current) {
      try {
        const { auditLogout } = await import("@/services/auditService");
        await auditLogout({
          id: current.id,
          displayName: current.displayName,
          email: current.email,
        });
      } catch {
        // silencieux
      }
    }
  };

  const value = {
    currentUser,
    loading,
    error,
    login,
    register,
    logout,
    refreshCurrentUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
