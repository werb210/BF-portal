import { describe, it, expect, vi } from 'vitest';
import {
  normalizeActionId,
  safeDeepLink,
  resolvePushAction,
  handlePushAction,
} from '../pushActions';

describe('v127 push actions', () => {
  it('normalizes known action ids and falls back to TAP', () => {
    expect(normalizeActionId('upload_now')).toBe('UPLOAD_NOW');
    expect(normalizeActionId('')).toBe('TAP');
    expect(normalizeActionId(undefined)).toBe('TAP');
    expect(normalizeActionId('WHATEVER')).toBe('TAP');
  });

  it('rejects deep links that are not app-relative', () => {
    expect(safeDeepLink('/applications/1')).toBe('/applications/1');
    expect(safeDeepLink('https://evil.example/x')).toBe('/');
    expect(safeDeepLink('//evil.example/x')).toBe('/');
    expect(safeDeepLink('/a/../../etc')).toBe('/');
    expect(safeDeepLink(null)).toBe('/');
  });

  it('upload action opens the uploader at the document route', () => {
    const intent = resolvePushAction({
      actionId: 'UPLOAD_NOW',
      data: { deepLink: '/applications/a1/documents', entityId: 'a1' },
    });
    expect(intent.route).toBe('/applications/a1/documents');
    expect(intent.effect).toBe('openUploader');
    expect(intent.background).toBe(false);
  });

  it('call back triggers the dialer', () => {
    const intent = resolvePushAction({ actionId: 'CALL_BACK', data: { deepLink: '/crm/contacts/c1' } });
    expect(intent.effect).toBe('startCall');
  });

  it('dismiss stays in the background and navigates nowhere', () => {
    const intent = resolvePushAction({ actionId: 'DISMISS', data: { deepLink: '/tasks/t1' } });
    expect(intent.background).toBe(true);
    expect(intent.route).toBe('');
  });

  it('a plain tap follows the deep link with no side effect', () => {
    const intent = resolvePushAction({ data: { deepLink: '/applications/a2' } });
    expect(intent.route).toBe('/applications/a2');
    expect(intent.effect).toBe('none');
  });

  it('handlePushAction wires navigation and the side effect', () => {
    const navigate = vi.fn();
    const openUploader = vi.fn();
    handlePushAction(
      { actionId: 'UPLOAD_NOW', data: { deepLink: '/applications/a1/documents', entityId: 'a1' } },
      { navigate, openUploader },
    );
    expect(navigate).toHaveBeenCalledWith('/applications/a1/documents');
    expect(openUploader).toHaveBeenCalledWith('a1');
  });

  it('handlePushAction does nothing visible for a background action', () => {
    const navigate = vi.fn();
    handlePushAction({ actionId: 'DISMISS', data: {} }, { navigate });
    expect(navigate).not.toHaveBeenCalled();
  });

  it('missing optional deps do not throw', () => {
    const navigate = vi.fn();
    expect(() =>
      handlePushAction({ actionId: 'CALL_BACK', data: { deepLink: '/crm/contacts/c1' } }, { navigate }),
    ).not.toThrow();
  });
});
