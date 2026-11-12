/**
 * Authentication Context for ENJ.
 * Manages active user session from Better Auth backend /api/me.
 * Handles login, signup, logout, session refresh, and auth error states.
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from '../services/api';
import { resolveApiBaseUrl } from '../lib/api/client';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  signIn: (email: string, pass: string) => Promise<void>;
  signUp: (email: string, pass: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  clearError: () => void;
  updateCurrentUser: (updated: Partial<User>) => void;
  switchPersona: (userId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refreshSession = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Make sure we are talking to a reachable API before asking for the session.
      await resolveApiBaseUrl();
      const currentUser = await api.auth.getCurrentUser();
      setUser(currentUser);
    } catch (err: any) {
      // 401 just means unauthenticated session
      if (err?.status !== 401) {
        console.warn('[AuthContext] Session fetch error:', err);
      }
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const signIn = async (email: string, pass: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const authenticatedUser = await api.auth.signIn(email, pass);
      setUser(authenticatedUser);
    } catch (err: any) {
      const msg = err?.message || 'Failed to sign in. Please check your credentials.';
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (email: string, pass: string, name: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const newUser = await api.auth.signUp(email, pass, name);
      setUser(newUser);
    } catch (err: any) {
      const msg = err?.message || 'Failed to create account. Please try again.';
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    try {
      await api.auth.signOut();
      setUser(null);
    } catch (err: any) {
      console.error('[AuthContext] Sign out error:', err);
      // Even if network fails, clear local user session state
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const updateCurrentUser = (updated: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...updated } : null));
  };

  const switchPersona = async (userId: string) => {
    setIsLoading(true);
    try {
      const switched = await api.auth.switchPersona(userId);
      setUser(switched);
    } catch (err) {
      console.warn('Switch persona error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        error,
        signIn,
        signUp,
        signOut,
        refreshSession,
        clearError,
        updateCurrentUser,
        switchPersona,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
