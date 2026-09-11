// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { toNotificationLike, buildDeps, defaultNavigate } from '../pushListener';

describe('v128 push listener', () => {
  beforeEach(() => {
    delete (window as unknown as Record<string, unknown>).__borealNavigate;
  });

  it('flattens the capacitor action payload', () => {
    const n = toNotificationLike({
      actionId: 'UPLOAD_NOW',
      notification: { data: { deepLink: '/applications/a1/documents', entityId: 'a1' } },
    });
    expect(n.actionId).toBe('UPLOAD_NOW');
    expect(n.data).toEqual({ deepLink: '/applications/a1/documents', entityId: 'a1' });
  });

  it('tolerates a malformed payload', () => {
    expect(toNotificationLike(null)).toEqual({ actionId: null, data: null });
    expect(toNotificationLike({})).toEqual({ actionId: null, data: null });
    expect(toNotificationLike({ actionId: 7 }).actionId).toBeNull();
  });

  it('prefers an injected navigate over the default', () => {
    const navigate = vi.fn();
    const deps = buildDeps({ navigate });
    deps.navigate('/x');
    expect(navigate).toHaveBeenCalledWith('/x');
  });

  it('default navigate uses the app router hook when present', () => {
    const hook = vi.fn();
    (window as unknown as Record<string, unknown>).__borealNavigate = hook;
    defaultNavigate('/crm/contacts/c1');
    expect(hook).toHaveBeenCalledWith('/crm/contacts/c1');
  });

  it('default navigate ignores an empty route', () => {
    const hook = vi.fn();
    (window as unknown as Record<string, unknown>).__borealNavigate = hook;
    defaultNavigate('');
    expect(hook).not.toHaveBeenCalled();
  });
});
