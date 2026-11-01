import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { AppRole, UserProfileData, AuthSession } from '../types/auth';
import { authService, DEMO_ACCOUNTS } from '../services/authService';
import { supabase, isSupabaseConfigured } from '../services/supabase';

interface AuthContextType {
  user: UserProfileData | null;
  role: AppRole;
  session: AuthSession | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isDemoMode: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (newPassword: string) => Promise<void>;
  switchDemoRole: (role: AppRole) => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfileData | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);

  const role: AppRole = user?.role ?? 'liaison';
  const isAuthenticated = Boolean(user && session);

  // Restore session on application mount
  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      try {
        setIsLoading(true);
        const restored = await authService.restoreSession();
        if (isMounted) {
          if (restored) {
            setUser(restored.user);
            setSession(restored.session);
            setIsDemoMode(restored.isDemo);
          } else {
            setUser(null);
            setSession(null);
            setIsDemoMode(false);
          }
        }
      } catch (err) {
        console.error('Failed to initialize session:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    initAuth();

    // Listen to Supabase Auth state changes if configured
    let subscription: { unsubscribe: () => void } | null = null;
    if (isSupabaseConfigured) {
      const { data } = supabase.auth.onAuthStateChange(async (event) => {
        if (event === 'SIGNED_OUT') {
          if (isMounted) {
            setUser(null);
            setSession(null);
          }
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          const res = await authService.restoreSession();
          if (isMounted && res) {
            setUser(res.user);
            setSession(res.session);
            setIsDemoMode(res.isDemo);
          }
        }
      });
      subscription = data.subscription;
    }

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const result = await authService.signIn(email, password);
      setUser(result.user);
      setSession(result.session);
      setIsDemoMode(result.isDemo);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await authService.signOut();
      setUser(null);
      setSession(null);
      setIsDemoMode(false);
    } finally {
      setIsLoading(false);
    }
  };

  const forgotPassword = async (email: string) => {
    await authService.resetPasswordForEmail(email);
  };

  const resetPassword = async (newPassword: string) => {
    await authService.updatePassword(newPassword);
  };

  const switchDemoRole = useCallback((newRole: AppRole) => {
    if (isSupabaseConfigured) return;
    const demoUser = DEMO_ACCOUNTS[newRole];
    const demoSession: AuthSession = {
      accessToken: `demo-token-${newRole}-${Date.now()}`,
      expiresAt: Date.now() + 86400000,
    };
    setUser(demoUser);
    setSession(demoSession);
    setIsDemoMode(true);
    localStorage.setItem('campusops_demo_auth', JSON.stringify({ user: demoUser, session: demoSession }));
  }, []);

  const refreshProfile = async () => {
    const restored = await authService.restoreSession();
    if (restored) {
      setUser(restored.user);
      setSession(restored.session);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        session,
        isLoading,
        isAuthenticated,
        isDemoMode,
        login,
        logout,
        forgotPassword,
        resetPassword,
        switchDemoRole,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

