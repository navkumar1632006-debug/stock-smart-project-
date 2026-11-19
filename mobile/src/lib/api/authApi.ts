import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { supabase } from '../supabase';
import { Session, User } from '@supabase/supabase-js';

// Prepares WebBrowser for in-flight OAuth redirects
WebBrowser.maybeCompleteAuthSession();

export const REDIRECT_URI = 'stocksmart://auth/callback';

export const authApi = {
  async getSession(): Promise<{ session: Session | null; user: User | null; error: Error | null }> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      return { session, user: session?.user || null, error: null };
    } catch (error: any) {
      console.error("Auth API - Error fetching session:", error);
      return { session: null, user: null, error };
    }
  },

  onAuthStateChange(callback: (event: string, session: Session | null) => void) {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);
    return subscription;
  },

  async signIn(email: string, password: string): Promise<{ data: any; error: Error | null }> {
    try {
      const cleanEmail = email.trim().toLowerCase();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });
      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      console.error("Auth API - Error signing in:", error);
      return { data: null, error };
    }
  },

  async signUp(
    email: string,
    password: string,
    fullName?: string
  ): Promise<{ data: any; error: Error | null }> {
    try {
      const cleanEmail = email.trim().toLowerCase();
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: fullName && fullName.trim() ? { full_name: fullName.trim() } : undefined,
          emailRedirectTo: REDIRECT_URI,
        },
      });
      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      console.error("Auth API - Error signing up:", error);
      return { data: null, error };
    }
  },

  async signInWithGoogle(): Promise<{ data: any; error: Error | null }> {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: REDIRECT_URI,
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;
      if (!data?.url) {
        throw new Error('Google OAuth initiation failed: no authorization URL returned by Supabase.');
      }

      const res = await WebBrowser.openAuthSessionAsync(data.url, REDIRECT_URI);

      if (res.type === 'success' && res.url) {
        // Robust custom-scheme URL parsing that handles hash and query fragments in React Native Hermes
        const rawUrl = res.url;
        const hashIdx = rawUrl.indexOf('#');
        const queryIdx = rawUrl.indexOf('?');
        let queryString = '';
        let hashString = '';
        if (hashIdx !== -1) {
          hashString = rawUrl.substring(hashIdx + 1);
          if (queryIdx !== -1 && queryIdx < hashIdx) {
            queryString = rawUrl.substring(queryIdx + 1, hashIdx);
          }
        } else if (queryIdx !== -1) {
          queryString = rawUrl.substring(queryIdx + 1);
        }
        const hashParams = new URLSearchParams(hashString);
        const queryParams = new URLSearchParams(queryString);

        const errorDesc =
          hashParams.get('error_description') ||
          queryParams.get('error_description') ||
          hashParams.get('error') ||
          queryParams.get('error');

        if (errorDesc) {
          throw new Error(decodeURIComponent(errorDesc.replace(/\+/g, ' ')));
        }

        const code = queryParams.get('code') || hashParams.get('code');
        const accessToken = hashParams.get('access_token') || queryParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token') || queryParams.get('refresh_token');

        if (code) {
          // Check if session was already established concurrently by AuthContext Linking listener
          const { data: existingSessionData } = await supabase.auth.getSession();
          if (existingSessionData?.session) {
            return { data: existingSessionData, error: null };
          }

          const { data: sessionData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            // Check again in case of race condition
            const { data: retrySession } = await supabase.auth.getSession();
            if (retrySession?.session) {
              return { data: retrySession, error: null };
            }
            throw exchangeError;
          }
          return { data: sessionData, error: null };
        }

        if (accessToken && refreshToken) {
          const { data: sessionData, error: setSessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (setSessionError) throw setSessionError;
          return { data: sessionData, error: null };
        }

        // Check if session is already stored
        const { data: activeSessionData } = await supabase.auth.getSession();
        if (activeSessionData?.session) {
          return { data: activeSessionData, error: null };
        }
      } else if (res.type === 'cancel' || res.type === 'dismiss') {
        return { data: null, error: new Error('Google sign-in was cancelled.') };
      }

      return { data: null, error: null };
    } catch (error: any) {
      console.error("Auth API - Error with Google sign-in:", error);
      return { data: null, error };
    }
  },

  async verifyOtp(
    email: string,
    token: string,
    type: 'signup' | 'recovery' | 'email_change' = 'signup'
  ): Promise<{ data: any; error: Error | null }> {
    try {
      const cleanEmail = email.trim().toLowerCase();
      const cleanToken = token.trim();
      const { data, error } = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: cleanToken,
        type: type as any,
      });
      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      console.error("Auth API - Error verifying OTP:", error);
      return { data: null, error };
    }
  },

  async resendVerification(email: string): Promise<{ error: Error | null }> {
    try {
      const cleanEmail = email.trim().toLowerCase();
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: cleanEmail,
        options: {
          emailRedirectTo: REDIRECT_URI,
        },
      });
      if (error) throw error;
      return { error: null };
    } catch (error: any) {
      console.error("Auth API - Error resending verification:", error);
      return { error };
    }
  },

  async resetPasswordForEmail(email: string): Promise<{ error: Error | null }> {
    try {
      const cleanEmail = email.trim().toLowerCase();
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: 'stocksmart://reset-password',
      });
      if (error) throw error;
      return { error: null };
    } catch (error: any) {
      console.error("Auth API - Error resetting password:", error);
      return { error };
    }
  },

  async updatePassword(password: string): Promise<{ error: Error | null }> {
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      return { error: null };
    } catch (error: any) {
      console.error("Auth API - Error updating password:", error);
      return { error };
    }
  },

  async signOut(): Promise<{ error: Error | null }> {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return { error: null };
    } catch (error: any) {
      console.error("Auth API - Error signing out:", error);
      return { error };
    }
  },
};
