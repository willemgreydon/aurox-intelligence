import { describe, expect, it } from 'vitest';
import { getCapabilitiesForRole, roleHasCapability } from './account';

describe('capability-based access (RBAC-lite)', () => {
  it('grants admin the console + management capabilities', () => {
    expect(roleHasCapability('admin', 'access_admin')).toBe(true);
    expect(roleHasCapability('admin', 'manage_users')).toBe(true);
    expect(roleHasCapability('admin', 'configure_providers')).toBe(true);
    expect(roleHasCapability('admin', 'view_monitoring')).toBe(true);
  });

  it('does NOT grant admin the live-trading capability (live stays locked)', () => {
    // Safety invariant: enabling live execution must require explicit elevation
    // beyond generic admin. Never grant activate_live via the admin role.
    expect(roleHasCapability('admin', 'activate_live')).toBe(false);
  });

  it('grants members no admin capabilities', () => {
    expect(getCapabilitiesForRole('member')).toHaveLength(0);
    expect(roleHasCapability('member', 'access_admin')).toBe(false);
    expect(roleHasCapability('member', 'manage_users')).toBe(false);
    expect(roleHasCapability('member', 'activate_live')).toBe(false);
  });
});
