// v128-push-listener
// Registers the Capacitor push listeners once and routes action taps through
// v127's pure resolver. Navigation is injected so the app can hand in its
// real router; the default falls back to a full location change.
import { Capacitor } from '@capacitor/core';
import { handlePushAction, type PushActionDeps, type NotificationLike } from './pushActions';

let installed = false;

export type PushListenerOptions = Partial<PushActionDeps> & {
  onRegistrationToken?: (token: string) => void;
  onError?: (err: unknown) => void;
};

export function defaultNavigate(route: string): void {
  if (!route) return;
  if (typeof window === 'undefined') return;
  const w = window as unknown as { __borealNavigate?: (r: string) => void };
  if (typeof w.__borealNavigate === 'function') {
    w.__borealNavigate(route);
    return;
  }
  window.location.assign(route);
}

export function buildDeps(options: PushListenerOptions): PushActionDeps {
  return {
    navigate: options.navigate || defaultNavigate,
    openUploader: options.openUploader,
    startCall: options.startCall,
    openFollowUpComposer: options.openFollowUpComposer,
  };
}

/** Exported for tests: the shape Capacitor hands back on an action tap. */
export function toNotificationLike(event: unknown): NotificationLike {
  const e = (event || {}) as Record<string, unknown>;
  const notification = (e.notification || {}) as Record<string, unknown>;
  return {
    actionId: typeof e.actionId === 'string' ? e.actionId : null,
    data: (notification.data as Record<string, unknown>) || null,
  };
}

export async function installPushListeners(options: PushListenerOptions = {}): Promise<boolean> {
  if (installed) return true;
  if (!Capacitor.isNativePlatform()) return false;

  let PushNotifications: {
    requestPermissions: () => Promise<{ receive: string }>;
    register: () => Promise<void>;
    addListener: (event: string, cb: (payload: unknown) => void) => Promise<unknown>;
  };
  try {
    const mod = await import('@capacitor/push-notifications');
    PushNotifications = mod.PushNotifications as typeof PushNotifications;
  } catch (err) {
    if (options.onError) options.onError(err);
    return false;
  }

  const deps = buildDeps(options);

  try {
    const perm = await PushNotifications.requestPermissions();
    if (perm.receive !== 'granted') return false;
    await PushNotifications.register();

    await PushNotifications.addListener('registration', (payload: unknown) => {
      const token = ((payload || {}) as Record<string, unknown>).value;
      if (typeof token === 'string' && options.onRegistrationToken) {
        options.onRegistrationToken(token);
      }
    });

    await PushNotifications.addListener('registrationError', (payload: unknown) => {
      if (options.onError) options.onError(payload);
    });

    await PushNotifications.addListener('pushNotificationActionPerformed', (payload: unknown) => {
      handlePushAction(toNotificationLike(payload), deps);
    });

    installed = true;
    return true;
  } catch (err) {
    if (options.onError) options.onError(err);
    return false;
  }
}

/** Test seam only. */
export function __resetPushListeners(): void {
  installed = false;
}
