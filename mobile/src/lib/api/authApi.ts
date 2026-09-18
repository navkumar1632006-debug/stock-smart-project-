import { supabase } from '../supabase';
import { Session, User } from '@supabase/supabase-js';

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
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      console.error("Auth API - Error signing in:", error);
      return { data: null, error };
    }
  },

  async signUp(email: string, password: string): Promise<{ data: any; error: Error | null }> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        // Omitted emailRedirectTo for native app defaults
      });
      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      console.error("Auth API - Error signing up:", error);
      return { data: null, error };
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

  async resetPasswordForEmail(email: string): Promise<{ error: Error | null }> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      return { error: null };
    } catch (error: any) {
      console.error("Auth API - Error resetting password:", error);
      return { error };
    }
  }
};
