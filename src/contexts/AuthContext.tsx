import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import * as AuthService from '../services/sqlite/auth';

interface AuthUser {
  id: string;
  uid: string;
  email: string | null;
  displayName: string | null;
  role?: string;
  avatarUrl?: string | null;
}

interface AuthContextType {
  currentUser: AuthUser | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshCurrentUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const SQLITE_DATA_CHANGED_EVENT = "sqlite-data-changed";

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshCurrentUser = useCallback(async () => {
    try {
      const user = await AuthService.getCurrentUser();
      if (user) {
        setCurrentUser({
          id: user.id,
          uid: user.id,
          email: user.email,
          displayName: user.displayName,
          role: user.role,
          avatarUrl: user.avatarUrl ?? null,
        });
      } else {
        setCurrentUser(null);
      }
      setError(null);
    } catch (error: any) {
      console.error('Error refreshing user:', error);
      setError(error.message || 'Failed to refresh user');
    }
  }, []);

  // Charger l'utilisateur au démarrage
  useEffect(() => {
    const loadUser = async () => {
      try {
        await refreshCurrentUser();
      } catch (error: any) {
        console.error('Error loading user:', error);
        setError(error.message || 'Failed to load user');
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [refreshCurrentUser]);

  useEffect(() => {
    const handleDataChanged = (event: Event) => {
      const customEvent = event as CustomEvent<{ tableName?: string }>;
      if (customEvent.detail?.tableName === "users" && localStorage.getItem("auth_token")) {
        refreshCurrentUser().catch((error) => {
          console.error("Error syncing current user:", error);
        });
      }
    };

    window.addEventListener(SQLITE_DATA_CHANGED_EVENT, handleDataChanged);
    return () => window.removeEventListener(SQLITE_DATA_CHANGED_EVENT, handleDataChanged);
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
      setError(null);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const register = async (email: string, password: string, displayName: string): Promise<AuthUser> => {
    const user = await AuthService.register({ email, password, displayName });
    setCurrentUser({
      id: user.id,
      uid: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      avatarUrl: user.avatarUrl ?? null,
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
    await AuthService.logout();
    setCurrentUser(null);
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

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
