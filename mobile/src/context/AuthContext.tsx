import React, { createContext, useContext, useEffect, useState, useMemo, useRef } from 'react';
import { Session, User } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { authApi } from '../lib/api/authApi';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isEmailVerified: boolean;
  error: Error | null;
  isPasswordRecoveryMode: boolean;
  signIn: (email: string, password: string) => Promise<{ data: any; error: Error | null }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ data: any; error: Error | null }>;
  signInWithGoogle: () => Promise<{ data: any; error: Error | null }>;
  signOut: () => Promise<{ error: Error | null }>;
  resendVerification: (email: string) => Promise<{ error: Error | null }>;
  verifyEmailOtp: (email: string, token: string) => Promise<{ data: any; error: Error | null }>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (password: string) => Promise<{ error: Error | null }>;
  clearError: () => void;
  clearRecoveryMode: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isPasswordRecoveryMode, setIsPasswordRecoveryMode] = useState(false);
  const lastProcessedUrlRef = useRef<string | null>(null);

  const isEmailVerified = useMemo(() => {
    if (!user) return false;
    // Check Supabase email_confirmed_at timestamp
    return !!(user.email_confirmed_at || user.confirmed_at);
  }, [user]);

  // Robust deep link parser for custom schemes (stocksmart://) and web redirects
  const handleUrl = async (rawUrl: string | null) => {
    if (!rawUrl) return;
    const url = rawUrl.trim();
    if (!url) return;

    // Prevent duplicate processing of the same deep link (e.g. cold start + event listener)
    if (lastProcessedUrlRef.current === url) {
      return;
    }
    lastProcessedUrlRef.current = url;

    try {
      // Extract query and hash fragments reliably without depending on WHATWG URL parser
      const hashIndex = url.indexOf('#');
      const queryIndex = url.indexOf('?');

      let queryString = '';
      let hashString = '';

      if (hashIndex !== -1) {
        hashString = url.substring(hashIndex + 1);
        if (queryIndex !== -1 && queryIndex < hashIndex) {
          queryString = url.substring(queryIndex + 1, hashIndex);
        }
      } else if (queryIndex !== -1) {
        queryString = url.substring(queryIndex + 1);
      }

      const hashParams = new URLSearchParams(hashString);
      const queryParams = new URLSearchParams(queryString);

      // Check for error payloads from Supabase callback
      const errorDesc =
        hashParams.get('error_description') ||
        queryParams.get('error_description') ||
        hashParams.get('error') ||
        queryParams.get('error');

      if (errorDesc) {
        const decoded = decodeURIComponent(errorDesc.replace(/\+/g, ' '));
        if (
          decoded.toLowerCase().includes('already confirmed') ||
          decoded.toLowerCase().includes('already verified')
        ) {
          setError(new Error('Your email is already verified. Please sign in with your credentials.'));
        } else if (
          decoded.toLowerCase().includes('expired') ||
          decoded.toLowerCase().includes('invalid')
        ) {
          setError(
            new Error('The email verification link is invalid or has expired. Please request a new verification link.')
          );
        } else {
          setError(new Error(decoded));
        }
        return;
      }

      const code = queryParams.get('code') || hashParams.get('code');
      const tokenHash = queryParams.get('token_hash') || hashParams.get('token_hash');
      const type = queryParams.get('type') || hashParams.get('type');
      const accessToken = hashParams.get('access_token') || queryParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token') || queryParams.get('refresh_token');

      // 1. PKCE Authorization Code Exchange
      if (code) {
        // Check if session was already established concurrently
        const { data: existingSessionData } = await supabase.auth.getSession();
        if (existingSessionData?.session) {
          setSession(existingSessionData.session);
          setUser(existingSessionData.session.user);
          if (type === 'recovery') {
            setIsPasswordRecoveryMode(true);
          }
          return;
        }

        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          // If code was already exchanged by WebBrowser, check session
          const { data: retrySessionData } = await supabase.auth.getSession();
          if (retrySessionData?.session) {
            setSession(retrySessionData.session);
            setUser(retrySessionData.session.user);
            if (type === 'recovery') {
              setIsPasswordRecoveryMode(true);
            }
            return;
          }
          throw exchangeError;
        }
        if (data.session) {
          setSession(data.session);
          setUser(data.session.user);
          if (type === 'recovery') {
            setIsPasswordRecoveryMode(true);
          }
        }
        return;
      }

      // 2. Direct Token Hash OTP Verification (Email Confirmation or Magic Link)
      if (tokenHash && type) {
        const { data, error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: type as any,
        });
        if (verifyError) throw verifyError;
        if (data.session) {
          setSession(data.session);
          setUser(data.session.user);
          if (type === 'recovery') {
            setIsPasswordRecoveryMode(true);
          }
        }
        return;
      }

      // 3. Direct Access + Refresh Token Pair
      if (accessToken && refreshToken) {
        const { data, error: setSessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (setSessionError) throw setSessionError;
        if (data.session) {
          setSession(data.session);
          setUser(data.session.user);
          if (type === 'recovery') {
            setIsPasswordRecoveryMode(true);
          }
        }
        return;
      }

      // 4. Reset Password path
      if (url.includes('stocksmart://reset-password')) {
        setIsPasswordRecoveryMode(true);
      }
    } catch (err: any) {
      console.error('Error handling deep link:', err);
      setError(err);
    }
  };

  useEffect(() => {
    let isMounted = true;

    async function initSession() {
      try {
        const { session: existingSession, user: existingUser, error: sessionError } = await authApi.getSession();
        if (sessionError) {
          console.warn('Initial session fetch warning:', sessionError.message);
        }
        if (isMounted) {
          setSession(existingSession);
          setUser(existingUser);
        }

        // Process initial deep link on cold start
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl && isMounted) {
          await handleUrl(initialUrl);
        }
      } catch (err: any) {
        if (isMounted) setError(err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    initSession();

    // Listen for deep link events while app is open/backgrounded
    const linkingSub = Linking.addEventListener('url', ({ url }) => {
      handleUrl(url);
    });

    // Supabase auth subscription
    const subscription = authApi.onAuthStateChange((_event, currentSession) => {
      if (isMounted) {
        setSession(currentSession);
        setUser(currentSession?.user || null);
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
      linkingSub.remove();
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    setError(null);
    const result = await authApi.signIn(email, password);
    if (result.error) {
      setError(result.error);
    } else if (result.data?.session) {
      setSession(result.data.session);
      setUser(result.data.session.user);
    }
    return result;
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    setError(null);
    const result = await authApi.signUp(email, password, fullName);
    if (result.error) {
      setError(result.error);
    } else if (result.data?.session) {
      setSession(result.data.session);
      setUser(result.data.session.user);
    }
    return result;
  };

  const signInWithGoogle = async () => {
    setError(null);
    const result = await authApi.signInWithGoogle();
    if (result.error) {
      setError(result.error);
    } else if (result.data?.session) {
      setSession(result.data.session);
      setUser(result.data.session.user);
    }
    return result;
  };

  const signOut = async () => {
    setError(null);
    const result = await authApi.signOut();
    if (result.error) {
      setError(result.error);
    } else {
      setSession(null);
      setUser(null);
      setIsPasswordRecoveryMode(false);
    }
    return result;
  };

  const resendVerification = async (email: string) => {
    return authApi.resendVerification(email);
  };

  const verifyEmailOtp = async (email: string, token: string) => {
    setError(null);
    const result = await authApi.verifyOtp(email, token, 'signup');
    if (result.error) {
      setError(result.error);
    } else if (result.data?.session) {
      setSession(result.data.session);
      setUser(result.data.session.user);
    }
    return result;
  };

  const resetPassword = async (email: string) => {
    return authApi.resetPasswordForEmail(email);
  };

  const updatePassword = async (password: string) => {
    const res = await authApi.updatePassword(password);
    if (!res.error) {
      setIsPasswordRecoveryMode(false);
    }
    return res;
  };

  const clearError = () => setError(null);
  const clearRecoveryMode = () => setIsPasswordRecoveryMode(false);

  const value = useMemo(
    () => ({
      session,
      user,
      isLoading,
      isAuthenticated: !!session && !!user,
      isEmailVerified,
      error,
      isPasswordRecoveryMode,
      signIn,
      signUp,
      signInWithGoogle,
      signOut,
      resendVerification,
      verifyEmailOtp,
      resetPassword,
      updatePassword,
      clearError,
      clearRecoveryMode,
    }),
    [session, user, isLoading, isEmailVerified, error, isPasswordRecoveryMode]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
