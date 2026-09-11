// v124-mobile-audit
// Greps the repo for evidence of each mobile feature. Evidence is not proof
// the feature works - it tells you where to look, and where nothing exists.
import fs from 'node:fs';
import path from 'node:path';

const ROOTS = ['src', 'ios', 'android', 'client-app'];
const EXTS = ['.ts', '.tsx', '.js', '.jsx', '.swift', '.kt', '.java', '.plist', '.json', '.xml', '.gradle'];
const SKIP = new Set(['node_modules', 'dist', 'build', '.git', 'Pods', '.next', 'coverage']);

const FEATURES = [
  ['01 actionable push actions', ['actionTypeId', 'UNNotificationAction', 'notificationActions', 'pushAction']],
  ['02 notification deep links', ['deepLink', 'deep_link', 'appUrlOpen', 'universalLink', 'handleNotificationTap']],
  ['03 native document scanner', ['DocumentScanner', 'VNDocumentCamera', 'mlkit/document-scanner']],
  ['04 document quality check', ['blurScore', 'qualityCheck', 'isBlurry', 'documentQuality']],
  ['05 document classification', ['classifyDocument', 'documentType', 'classifyUpload']],
  ['06 background upload queue', ['uploadQueue', 'backgroundUpload', 'retryUpload', 'pendingUploads']],
  ['07 biometric re-entry', ['BiometricAuth', 'biometric', 'FaceID', 'Touch ID']],
  ['10 dialer post-call workflow', ['postCall', 'callDisposition', 'afterCall']],
  ['11 automatic follow-up creation', ['createFollowUp', 'followUpTask', 'proposeNextAction']],
  ['12 share to Boreal extension', ['ShareExtension', 'NSExtension', 'shareTarget', 'share_target']],
  ['15 iPad split view', ['splitView', 'SplitView', 'UIRequiresFullScreen', 'MultipleScenes']],
  ['16 Apple Pencil annotation', ['PencilKit', 'PKCanvasView', 'annotate']],
  ['17 keyboard shortcuts', ['useKeyboardShortcuts', 'metaKey', 'KeyboardShortcut']],
  ['18 business-card scanner', ['BusinessCardScan', 'businessCard', 'scanCard']],
  ['14 Quick Look', ['QLPreviewController', 'QuickLook', 'previewDocument', 'previewFile']],
  ['drag and drop', ['FileDropZone', 'onDrop', 'dataTransfer']],
  ['19 AI post-call summary', ['callSummary', 'summarizeCall', 'postCallSummary']],
  ['20 call transcription', ['transcript', 'transcribe', 'Transcription']],
  ['21 call disposition', ['disposition', 'Disposition']],
  ['22 auto CRM pipeline update', ['movePipeline', 'pipelineStage', 'autoAdvance']],
  ['23-27 Apple Watch', ['WatchKit', 'watchOS', 'ComplicationController', 'WidgetKit']],
  ['28 Siri / App Intents', ['AppIntent', 'INIntent', 'SiriKit', 'donateIntent']],
  ['29 Action Button / Control Center', ['ControlWidget', 'ActionButton']],
  ['30 Live Activities', ['ActivityKit', 'LiveActivity', 'ActivityAttributes']],
  ['31 offline queue', ['offlineQueue', 'queuedMutations', 'syncPending', 'outbox']],
  ['32 background sync', ['BGTaskScheduler', 'BGAppRefresh', 'backgroundSync', 'WorkManager']],
  ['36-38 widgets', ['WidgetKit', 'TimelineProvider', 'IntentTimeline']],
  ['08 applicant action center', ['ActionCenter', 'actionCenter', 'whatYouNeedToDo']],
  ['09 application progress view', ['ApplicationProgress', 'progressSteps', 'ProgressTracker']],
];

function walk(dir, out) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (err) {
    return;
  }
  for (const e of entries) {
    if (SKIP.has(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (EXTS.includes(path.extname(e.name))) out.push(full);
  }
}

const files = [];
for (const r of ROOTS) if (fs.existsSync(r)) walk(r, files);
console.log('V124 scanned files: ' + files.length);

const contents = new Map();
for (const f of files) {
  try {
    contents.set(f, fs.readFileSync(f, 'utf8'));
  } catch (err) {
    // unreadable, skip
  }
}

const rows = [];
for (const [name, patterns] of FEATURES) {
  const hits = [];
  for (const [file, text] of contents) {
    for (const p of patterns) {
      if (text.includes(p)) {
        hits.push(file + ' [' + p + ']');
        break;
      }
    }
  }
  const status = hits.length === 0 ? 'ABSENT' : hits.length <= 2 ? 'PARTIAL' : 'PRESENT';
  rows.push({ name, status, hits });
}

console.log('');
console.log('V124 FEATURE AUDIT =========================================');
for (const r of rows) {
  console.log(r.status.padEnd(8) + ' ' + r.name + '  (' + r.hits.length + ' files)');
}
console.log('');
console.log('V124 EVIDENCE');
for (const r of rows) {
  if (r.status === 'ABSENT') continue;
  console.log('--- ' + r.name);
  r.hits.slice(0, 6).forEach((h) => console.log('    ' + h));
}
console.log('');
console.log('V124 ABSENT COUNT: ' + rows.filter((r) => r.status === 'ABSENT').length + ' of ' + rows.length);
console.log('V124 FEATURE AUDIT END =====================================');
