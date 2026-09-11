// v127-push-actions
// Maps a tapped notification action to a route and an optional side effect.
// Pure logic so it is unit-testable off-device; the Capacitor listener is a
// thin shell around resolvePushAction().

export type PushActionId =
  | 'UPLOAD_NOW'
  | 'OPEN_APPLICATION'
  | 'CALL_BACK'
  | 'CREATE_FOLLOWUP'
  | 'VIEW_OFFER'
  | 'DISMISS';

export type PushIntent = {
  /** Route to navigate to, or '' when the action stays in the background. */
  route: string;
  /** Named side effect the caller performs after navigation. */
  effect: 'none' | 'openUploader' | 'startCall' | 'openFollowUpComposer';
  /** True when the OS should not bring the app to the foreground. */
  background: boolean;
};

export type NotificationLike = {
  actionId?: string | null;
  data?: Record<string, unknown> | null;
};

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

export function normalizeActionId(raw: unknown): PushActionId | 'TAP' {
  const s = str(raw).toUpperCase();
  const known: PushActionId[] = [
    'UPLOAD_NOW',
    'OPEN_APPLICATION',
    'CALL_BACK',
    'CREATE_FOLLOWUP',
    'VIEW_OFFER',
    'DISMISS',
  ];
  if (known.indexOf(s as PushActionId) >= 0) return s as PushActionId;
  return 'TAP';
}

/**
 * The server always ships a deepLink in data. A missing or non-absolute link
 * is treated as untrusted and falls back to the app root rather than being
 * followed - a push payload must never be able to drive an arbitrary URL.
 */
export function safeDeepLink(raw: unknown): string {
  const s = str(raw);
  if (!s) return '/';
  if (s.indexOf('//') === 0) return '/';
  if (s.charAt(0) !== '/') return '/';
  if (s.indexOf('..') >= 0) return '/';
  return s;
}

export function resolvePushAction(notification: NotificationLike): PushIntent {
  const data = notification.data || {};
  const link = safeDeepLink(data.deepLink);
  const action = normalizeActionId(notification.actionId);

  switch (action) {
    case 'UPLOAD_NOW':
      return { route: link, effect: 'openUploader', background: false };
    case 'VIEW_OFFER':
      return { route: link, effect: 'none', background: false };
    case 'OPEN_APPLICATION':
      return { route: link, effect: 'none', background: false };
    case 'CALL_BACK':
      return { route: link, effect: 'startCall', background: false };
    case 'CREATE_FOLLOWUP':
      return { route: link, effect: 'openFollowUpComposer', background: false };
    case 'DISMISS':
      return { route: '', effect: 'none', background: true };
    default:
      return { route: link, effect: 'none', background: false };
  }
}

export type PushActionDeps = {
  navigate: (route: string) => void;
  openUploader?: (entityId: string) => void;
  startCall?: (entityId: string) => void;
  openFollowUpComposer?: (entityId: string) => void;
};

export function handlePushAction(notification: NotificationLike, deps: PushActionDeps): PushIntent {
  const intent = resolvePushAction(notification);
  if (intent.background) return intent;

  if (intent.route) deps.navigate(intent.route);

  const entityId = str((notification.data || {}).entityId);
  if (intent.effect === 'openUploader' && deps.openUploader) deps.openUploader(entityId);
  if (intent.effect === 'startCall' && deps.startCall) deps.startCall(entityId);
  if (intent.effect === 'openFollowUpComposer' && deps.openFollowUpComposer) {
    deps.openFollowUpComposer(entityId);
  }
  return intent;
}
