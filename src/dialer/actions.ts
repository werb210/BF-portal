// BF_PORTAL_BLOCK_v600_DIALER_PROVIDER_v1
import { useDialer } from "./store";
import { dialerApi } from "./api";
import { preflight } from "./sanityCheck";
import { ringPush } from "./debugRing";
function normalizeE164(raw: string): string { const s=(raw??"").trim(); if(/^\+\d{8,15}$/.test(s)) return s; const digits=s.replace(/\D+/g,""); if(digits.length===11&&digits.startsWith("1")) return `+${digits}`; if(digits.length===10) return `+1${digits}`; if(digits.length>=8&&digits.length<=15) return `+${digits}`; return ""; }
export async function startOutboundPstn(toRaw: string, opts?: { applicationId?: string | null; contactId?: string | null; contactName?: string | null; silo?: string }) { const st=useDialer.getState(); const to=normalizeE164(toRaw); if(!to){st.setStatus("error","invalid_phone"); return;} const pre=await preflight(st.device); if(!pre.ok){st.setStatus("error",pre.reason); ringPush("call.preflight.fail",pre); return;} st.clearTranscript(); st.setStatus("dialing"); st.open({phone:to,applicationId:opts?.applicationId??null,contactId:opts?.contactId??null,contactName:opts?.contactName??null}); try{ const r:any=await dialerApi.startCall({to,silo:opts?.silo??"BF",applicationId:opts?.applicationId,contactId:opts?.contactId,contactName:opts?.contactName}); const body=r?.data??r; if(!body?.ok){st.setStatus("error","call_setup_failed"); return;} ringPush("call.start.ok",body); const call=await st.device!.connect({params:{conferenceFriendly:body.conferenceFriendly}}); st.setCall(call); call.on("ringing",()=>{ringPush("call.ringing"); st.setStatus("ringing");}); call.on("accept",()=>{ringPush("call.accept"); st.setStatus("connected");}); call.on("disconnect",()=>{ringPush("call.disconnect"); st.setCall(null); st.setStatus("ready");}); call.on("error",(e:any)=>{ringPush("call.error",e?.message); st.setStatus("error",e?.message??"call_error");}); } catch(e:any){ ringPush("call.start.fail",e?.message); st.setStatus("error",e?.message??"call_setup_failed"); }}
export async function startInternalCall(staffIdentity:string, opts?:{contactName?:string}) { const st=useDialer.getState(); const pre=await preflight(st.device); if(!pre.ok){st.setStatus("error",pre.reason); return;} st.clearTranscript(); st.setStatus("dialing"); st.open({contactName: opts?.contactName ?? staffIdentity}); const r:any = await dialerApi.startCall({staffIdentity, contactName: opts?.contactName}); const body=r?.data??r; if(!body?.ok){st.setStatus("error","call_setup_failed"); return;} const call=await st.device!.connect({params:{conferenceFriendly:body.conferenceFriendly}}); st.setCall(call); call.on("disconnect",()=>{st.setCall(null); st.setStatus("ready");}); }
export async function hangup(){ const st=useDialer.getState(); if(st.call){ try{st.call.disconnect();}catch{}} st.setCall(null); st.setStatus("ready"); }
export async function answerIncoming(){
  // v193_answer_pending: prefer the live `pendingCall` object stashed by
  // DialerProvider.incoming (browser-SDK direct invite). Only fall back to
  // device.connect when only a conferenceFriendly is known (SSE-driven flow).
  const st = useDialer.getState();
  if (!st.incoming) return;
  const pending = (st.incoming as any).pendingCall;
  if (pending && typeof pending.accept === "function") {
    pending.accept();
    st.setCall(pending);
    st.setIncoming(null);
    st.setStatus("connected");
    pending.on("disconnect", () => { st.setCall(null); st.setStatus("ready"); });
    return;
  }
  if (!st.device) return;
  const friendly = st.incoming.conferenceFriendly;
  st.setIncoming(null);
  st.clearTranscript();
  st.open();
  st.setStatus("dialing");
  const call = await st.device.connect({ params: { conferenceFriendly: friendly } });
  st.setCall(call);
  call.on("accept", () => st.setStatus("connected"));
  call.on("disconnect", () => { st.setCall(null); st.setStatus("ready"); });
}
export function declineIncoming(){
  // v193_decline_pending: reject the live SDK call if we have it.
  const st = useDialer.getState();
  const pending = (st.incoming as any)?.pendingCall;
  if (pending && typeof pending.reject === "function") {
    try { pending.reject(); } catch { /* best-effort */ }
  }
  st.setIncoming(null);
}
