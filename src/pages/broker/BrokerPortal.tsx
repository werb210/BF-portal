// BF_PORTAL_BROKER_PORTAL_v717 - separate broker portal at /broker.
// BF_PORTAL_v828_PARTNER_PORTAL_THEME - on the UI guide (dark surfaces, blue primary actions, styled upload, iPad
// layout) with a stage tracker on every file.
import { useCallback, useEffect, useState } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { api, rawApiFetch } from "@/api";
import ReferrerSignupPage from "@/pages/referrer/ReferrerSignupPage";
import ReferrerLoginPage from "@/pages/referrer/ReferrerLoginPage";
import FileDrop from "@/components/partner/FileDrop";
import PartnerHeader from "@/components/partner/PartnerHeader";
import StageTracker, { type TrackerInput } from "@/components/partner/StageTracker";
import "@/components/partner/partnerPortal.css";

type BrokerFile = { import_id:string; application_id:string|null; business_name:string|null; zip_name:string; import_status:string; stage:string|null; created_at:string; boreal_pct:number|null; broker_pct:number|null; terms:string|null; split_status:string|null; broker_counter_pct:number|null; payout_amount:number|null; payout_paid_on:string|null };
const auth = () => ({ Authorization: `Bearer ${sessionStorage.getItem("referrer_token") ?? ""}` });
const money = (v: unknown) => "$" + Number(v ?? 0).toLocaleString("en-CA", { maximumFractionDigits: 2 });
export function stageLabel(f: Pick<BrokerFile,"stage"|"import_status">) { if(f.import_status==="failed") return "Upload could not be read"; if(!f.stage||f.stage==="draft") return "Waiting for the client to sign in"; return f.stage; }

/** BF_PORTAL_v828_PARTNER_STAGE_TRACKER - where a broker file sits on the stage tracker. */
export function brokerTracker(f: Pick<BrokerFile, "stage" | "import_status">): TrackerInput {
  if (f.import_status === "failed") return { hold: "unreadable" };
  if (f.import_status === "discarded") return { hold: "not_accepted" };
  return { stage: f.stage, hold: "waiting_client" };
}

export function SplitBox({f,onDone}:{f:BrokerFile;onDone:()=>void}) {
  const [counter,setCounter]=useState(false), [pct,setPct]=useState(""), [note,setNote]=useState(""), [msg,setMsg]=useState<string|null>(null);
  const send=async(body:Record<string,unknown>)=>{setMsg(null);try{await api(`/api/broker/files/${f.application_id}/split`,{method:"POST",headers:auth(),body:JSON.stringify(body)});onDone();}catch{setMsg("That did not go through. Try again.");}};
  if(!f.split_status) return <span className="pp-muted">Boreal will propose a split</span>;
  if(f.split_status==="accepted") return <span><span className="pp-pill pp-pill--success">Agreed</span> You {f.broker_pct??"-"}% / Boreal {f.boreal_pct??"-"}%{f.terms?` (${f.terms})`:""}</span>;
  if(f.split_status==="countered") return <span>You proposed {f.broker_counter_pct!==null?`${f.broker_counter_pct}%`:"a new split"}; waiting for Boreal</span>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }} data-testid={`split-${f.application_id}`}>
      <div>Boreal proposes: you {f.broker_pct??"-"}% / Boreal {f.boreal_pct??"-"}%{f.terms?` (${f.terms})`:""}</div>
      {!counter ? (
        <div className="pp-row">
          <button type="button" className="pp-btn pp-btn--primary" onClick={()=>{if(window.confirm("Accept this split? It locks for this file."))void send({action:"accept"});}}>Accept</button>
          <button type="button" className="pp-btn" onClick={()=>setCounter(true)}>Propose a different split</button>
        </div>
      ) : (
        <div className="pp-row">
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14 }}>Your share %
            <input aria-label="Your share %" style={{ width: 80, minHeight: 40, padding: "0 10px" }} type="number" min={0} max={100} value={pct} onChange={e=>setPct(e.target.value)}/>
          </label>
          <input aria-label="Note" placeholder="Note (optional)" style={{ minHeight: 40, padding: "0 10px", minWidth: 0, flex: "1 1 160px" }} value={note} onChange={e=>setNote(e.target.value)}/>
          <button type="button" className="pp-btn pp-btn--primary" disabled={!pct} onClick={()=>void send({action:"counter",broker_pct:Number(pct),note})}>Send</button>
        </div>
      )}
      {msg && <div role="alert" className="pp-error">{msg}</div>}
    </div>
  );
}

export function BrokerHome(){
  const navigate=useNavigate(),[files,setFiles]=useState<BrokerFile[]|null>(null),[me,setMe]=useState<{company:string;name:string}|null>(null),[file,setFile]=useState<File|null>(null),[phone,setPhone]=useState(""),[busy,setBusy]=useState(false),[msg,setMsg]=useState<string|null>(null);
  const load=useCallback(async()=>{try{const m=await api<{broker:{company:string;name:string}}>("/api/broker/me",{headers:auth()});setMe(m?.broker??null);const r=await api<{files:BrokerFile[]}>("/api/broker/files",{headers:auth()});setFiles(Array.isArray(r?.files)?r.files:[]);}catch{setFiles([]);setMsg("Could not load your files. If you have not signed the broker agreement yet, finish signing first.");}},[]);
  useEffect(()=>{void load();},[load]);
  const upload=async()=>{if(!file)return setMsg("Choose the client's zip file.");if(!/[.]zip$/i.test(file.name))return setMsg("Upload a .zip file (one per client).");const fd=new FormData();fd.append("file",file);if(phone.trim())fd.append("applicant_phone",phone.trim());setBusy(true);setMsg(null);try{const res=await rawApiFetch("/api/broker/files",{method:"POST",body:fd,headers:auth()});const j=await res.json().catch(()=>({})) as {message?:string;error?:string;businessName?:string};if(!res.ok){setMsg(j.message??j.error??`Upload failed (${res.status}).`);return;}setMsg(`Uploaded${j.businessName?` ${j.businessName}`:""}. Boreal will review it and contact the client for anything missing.`);setFile(null);setPhone("");void load();}catch{setMsg("Upload failed. Check your connection and try again.");}finally{setBusy(false);}};
  const signOut=()=>{sessionStorage.removeItem("referrer_token");sessionStorage.removeItem("referrer_user");navigate("/broker/login");};
  return (
    <main className="partner-portal">
      <div className="pp-page">
        <PartnerHeader title={`Broker Portal${me?` - ${me.company}`:""}`} welcome={me?.name ? `Welcome ${me.name.split(/\s+/)[0]}` : null}
          actions={<button type="button" className="pp-btn" onClick={signOut}>Log out</button>} />

        <section className="pp-card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <h2 className="pp-title">Send a file</h2>
          <p className="pp-muted" style={{ margin: 0 }}>One zip per client with their completed application and documents.</p>
          <FileDrop label="Client zip file" accept=".zip" disabled={busy}
            title={file ? file.name : "Tap to choose the client's zip, or drop it here"}
            hint={file ? "Tap to choose a different file" : "One .zip per client"}
            onFiles={(list)=>setFile(list[0]??null)} />
          <div className="pp-row">
            <input aria-label="Client mobile (optional)" placeholder="Client mobile (optional)" inputMode="tel" style={{ minHeight: 40, padding: "0 12px", flex: "1 1 220px", minWidth: 0 }} value={phone} onChange={e=>setPhone(e.target.value)}/>
            <button type="button" className="pp-btn pp-btn--primary" disabled={busy} onClick={()=>void upload()}>{busy?"Uploading...":"Upload"}</button>
          </div>
          {msg && <p role="status" style={{ margin: 0, fontSize: 14 }}>{msg}</p>}
        </section>

        <section className="pp-card">
          <h2 className="pp-title" style={{ marginBottom: 4 }}>Your files</h2>
          <p className="pp-muted" style={{ margin: "0 0 12px" }}>Follow each file from when we receive it to when it funds.</p>
          {files===null ? <p className="pp-muted">Loading...</p> : files.length===0 ? <p className="pp-muted">No files yet.</p> : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {files.map(f=>(
                <article key={f.import_id} className="pp-card pp-card--inset" data-testid="broker-file">
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
                    <div style={{ minWidth: 0 }}>
                      <div className="pp-subtitle" style={{ overflowWrap: "anywhere" }}>{f.business_name??f.zip_name}</div>
                      <div className="pp-muted">Sent {new Date(f.created_at).toLocaleDateString("en-CA")}</div>
                    </div>
                    {f.payout_amount!=null && <div style={{ fontSize: 13 }}><span className="pp-muted">Your payout: </span>{money(f.payout_amount)}{f.payout_paid_on?` paid ${f.payout_paid_on}`:""}</div>}
                  </div>
                  <StageTracker {...brokerTracker(f)} label={`Stage for ${f.business_name??f.zip_name}`} />
                  {f.application_id && (
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--pp-border)", fontSize: 14 }}>
                      <div className="pp-muted" style={{ fontSize: 12, marginBottom: 4 }}>Commission split</div>
                      <SplitBox f={f} onDone={()=>void load()}/>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
export default function BrokerPortalRoutes(){const signedIn=Boolean(sessionStorage.getItem("referrer_token"));return <Routes><Route path="signup" element={<ReferrerSignupPage kind="broker"/>}/><Route path="login" element={<ReferrerLoginPage kind="broker"/>}/><Route path="/" element={signedIn?<BrokerHome/>:<Navigate to="/broker/signup" replace/>}/><Route path="*" element={<Navigate to="/broker" replace/>}/></Routes>}
