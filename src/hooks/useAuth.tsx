import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { authApi } from '../lib/api/authApi';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: Error | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    async function initializeAuth() {
      try {
        // Check for callback errors in the URL hash (e.g. expired email verification link)
        if (typeof window !== 'undefined' && window.location.hash.includes('error=')) {
          const params = new URLSearchParams(window.location.hash.substring(1));
          const errorDesc = params.get('error_description');
          if (errorDesc) {
            setError(new Error(errorDesc.replace(/\+/g, ' ')));
            window.history.replaceState(null, '', window.location.pathname);
          }
        }

        const { session: currentSession, user: currentUser, error: fetchError } = await authApi.getSession();
        
        if (!mounted) return;

        if (fetchError) {
          setError(fetchError);
        } else {
          setSession(currentSession);
          setUser(currentUser);
        }
      } catch (err: any) {
        if (mounted) setError(err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    initializeAuth();

    const subscription = authApi.onAuthStateChange((event, newSession) => {
      if (mounted) {
        setSession(newSession);
        setUser(newSession?.user || null);
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = {
    session,
    user,
    isLoading,
    isAuthenticated: !!session,
    error
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
