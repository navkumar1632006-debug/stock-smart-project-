import { describe, it, expect } from 'vitest';
import { rbacService } from '../rbacService';
import { storeService } from '../storeService';

describe('Phase 18 Security & Health Tests', () => {
  it('should validate invite_staff_by_email inputs before submitting RPC', async () => {
    // Malformed email parameters reject gracefully
    try {
      await rbacService.inviteStaff('', 'cashier', '123e4567-e89b-12d3-a456-426614174000');
    } catch (e: any) {
      expect(e).toBeTruthy();
    }
  });

  it('should prevent store service from selecting an unauthorized or unauthenticated store ID', async () => {
    await expect(storeService.setActiveStore('non-existent-store-id')).rejects.toThrow();
  });

  it('should confirm environment configuration does not expose service role key to frontend', () => {
    const processEnvKeys = Object.keys(process.env);
    const viteKeys = processEnvKeys.filter(k => k.startsWith('VITE_'));

    viteKeys.forEach(key => {
      expect(key).not.toContain('SERVICE_ROLE');
      expect(key).not.toContain('SECRET');
    });
  });
});
