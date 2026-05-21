// BF_PORTAL_BLOCK_v600_DIALER_PROVIDER_v1
import { useEffect, useRef } from "react";
import { Device } from "@twilio/voice-sdk";
import { useDialer } from "./store";
import { dialerApi } from "./api";
import { onSse, startSse, stopSse } from "./sse";
import { ringPush } from "./debugRing";
import { probeMicPermission, listAudioDevices } from "./sanityCheck";
import { useAuth } from "@/auth/AuthContext";
import { useSilo } from "@/context/SiloContext";
export default function DialerProvider() { const { authenticated, authStatus } = useAuth(); const silo = useSilo()?.silo ?? "BF";
const setDevice=useDialer((s)=>s.setDevice), setStatus=useDialer((s)=>s.setStatus), setIncoming=useDialer((s)=>s.setIncoming), setConference=useDialer((s)=>s.setConference), patchParticipants=useDialer((s)=>s.patchParticipants), appendTranscript=useDialer((s)=>s.appendTranscript), setMicPermission=useDialer((s)=>s.setMicPermission); const initOnce=useRef(false);
useEffect(()=>{ if (!authenticated || authStatus!=="authenticated") return; startSse(silo); const off=onSse((event,data)=>{ switch(event){ case "conference.update": if(data?.conference) setConference(data.conference, data.participants ?? []); else if(data?.participants) patchParticipants(data.participants); break; case "conference.incoming": setIncoming({conferenceFriendly:data.conferenceFriendly, fromDisplay:data.fromDisplay}); break; case "conference.incoming.answered": setIncoming(null); break; case "transcript.live": appendTranscript({pid:data.pid,text:data.text,final:data.final,ts:data.ts}); break; }}); return ()=>{off(); stopSse();}; }, [authenticated,authStatus,silo,setConference,patchParticipants,setIncoming,appendTranscript]);
useEffect(()=>{ if(initOnce.current) return; if(!authenticated || authStatus!=="authenticated") return; initOnce.current=true; (async()=>{ try { setStatus("preflight"); const tokRes:any=await dialerApi.voiceToken(); const tok=tokRes?.data?.token ?? tokRes?.token; if(!tok){setStatus("error","no_voice_token"); return;} const device = new Device(tok,{codecPreferences:["opus","pcmu"] as any, allowIncomingWhileBusy:false, logLevel:1});
 device.on("registered",()=>{ ringPush("device.registered"); setDevice(device); setStatus("ready");}); device.on("error",(e:any)=>{ringPush("device.error",{code:e?.code,msg:e?.message}); setStatus("error", e?.message ?? "device_error");}); device.on("unregistered",()=>{ringPush("device.unregistered"); setStatus("idle");}); device.on("tokenWillExpire", async()=>{ try{ const r:any=await dialerApi.voiceToken(); const fresh=r?.data?.token ?? r?.token; if(fresh) await device.updateToken(fresh);}catch{}});
 device.on("incoming",(call)=>{ ringPush("device.incoming",{params:(call as any).customParameters}); call.accept(); useDialer.getState().setCall(call); useDialer.getState().setStatus("connected"); call.on("disconnect",()=>{useDialer.getState().setCall(null); useDialer.getState().setStatus("ready");});});
 await device.register(); setMicPermission(await probeMicPermission()); const {inputs,outputs}=await listAudioDevices(); if(inputs[0]?.deviceId) useDialer.getState().setInputDevice(inputs[0].deviceId); if(outputs[0]?.deviceId) useDialer.getState().setOutputDevice(outputs[0].deviceId);
 } catch (e:any) { ringPush("device.bootstrap.fail", e?.message); setStatus("error", e?.message ?? "bootstrap_failed"); }})(); }, [authenticated,authStatus,setDevice,setStatus,setMicPermission]);
return null; }
