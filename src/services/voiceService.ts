// BF_PORTAL_BLOCK_v224_DIALER_RIP_OUT_v1
// Legacy voiceService surface kept so existing imports compile.
// All entry points are no-ops; the dialer is removed (see App.tsx
// VoiceBootstrap and bootstrapVoice.ts for the rationale).

import type { Call, Device } from "@twilio/voice-sdk";

export async function initVoice(_userId?: string): Promise<void> { /* no-op */ }
export async function startOutboundCall(_clientId: string): Promise<void> { /* no-op */ }
export async function acceptIncoming(_call: Call): Promise<boolean> { return false; }
export function rejectIncoming(_call: Call): void { /* no-op */ }
export function destroyVoice(): void { /* no-op */ }
export async function initializeVoice(_identity: string): Promise<void> { /* no-op */ }
export function getDevice(): Device | null { return null; }
export async function makeCall(_to: string): Promise<void> { /* no-op */ }
