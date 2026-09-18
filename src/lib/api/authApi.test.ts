import { describe, it, expect, vi } from 'vitest';
import { authApi } from './authApi';
import { supabase } from '../supabase/client';

// Mock the supabase client methods
vi.mock('../supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      resend: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: {} } }))
    }
  }
}));

describe('authApi', () => {
  it('should call getSession and return data', async () => {
    const mockSession = { user: { id: '123', email: 'test@example.com' } };
    (supabase.auth.getSession as any).mockResolvedValue({ data: { session: mockSession }, error: null });

    const result = await authApi.getSession();
    expect(result.session).toEqual(mockSession);
    expect(result.user).toEqual(mockSession.user);
    expect(result.error).toBeNull();
  });

  it('should handle getSession errors', async () => {
    const mockError = new Error('Auth failed');
    (supabase.auth.getSession as any).mockResolvedValue({ data: { session: null }, error: mockError });

    const result = await authApi.getSession();
    expect(result.session).toBeNull();
    expect(result.error).toEqual(mockError);
  });

  it('should call signOut', async () => {
    (supabase.auth.signOut as any).mockResolvedValue({ error: null });
    const result = await authApi.signOut();
    expect(result.error).toBeNull();
    expect(supabase.auth.signOut).toHaveBeenCalled();
  });
});
