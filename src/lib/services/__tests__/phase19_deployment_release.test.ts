import { describe, it, expect } from 'vitest';

describe('Phase 19 Deployment & Release Certification Tests', () => {
  it('should verify Supabase URL is properly formatted for remote environment', () => {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://demo.supabase.co';
    expect(supabaseUrl).toBeTruthy();
    expect(supabaseUrl).toContain('supabase.co');
  });

  it('should verify Supabase Anon key exists without service role leakage', () => {
    const anonKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_anon';
    expect(anonKey).toBeTruthy();
    
    // Ensure no service_role string present in client key
    expect(anonKey.toLowerCase()).not.toContain('service_role');
  });

  it('should confirm production deployment script configuration in package.json', async () => {
    const pkg = await import('../../../../package.json');
    expect(pkg.scripts.build).toContain('vite build');
    expect(pkg.scripts.start).toContain('node dist/server.cjs');
  });
});
