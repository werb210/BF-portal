// BF_PORTAL_BLOCK_1_28B_TAB_CONTENT_REBUILD
import { useEffect, useMemo, useState } from "react";
import { api } from "@/utils/api";
interface Props { applicationId?: string; }
type DocumentRow = { documentId: string; category: string | null; title: string | null; filename: string | null; size: number | null; storageKey: string | null; createdAt: string | null; status?: "accepted"|"rejected"|"pending"|string; };
type PortalApplicationResponse = { documents?: DocumentRow[] };
const CATEGORY_GROUPS = [
  { id: "banking", label: "Banking", matchesCategory: (c: string) => /bank|statement/i.test(c) },
  { id: "financials", label: "Financial Statements", matchesCategory: (c: string) => /financial|income|p_?l|profit|balance/i.test(c) },
  { id: "tax", label: "Tax Documents", matchesCategory: (c: string) => /tax/i.test(c) }
];
export default function DocumentsTab({ applicationId }: Props) {
  const [docs,setDocs]=useState<DocumentRow[]>([]); const [loading,setLoading]=useState(true); const [error,setError]=useState<string|null>(null);
  useEffect(()=>{ if(!applicationId){setLoading(false);return;} setLoading(true); api<PortalApplicationResponse>(`/api/portal/applications/${applicationId}`).then(r=>{setDocs(Array.isArray(r?.documents)?r.documents:[]); setError(null);}).catch(e=>setError(e instanceof Error?e.message:"Unable to load documents")).finally(()=>setLoading(false)); },[applicationId]);
  const grouped=useMemo(()=>groupByCategory(docs),[docs]);
  if (!applicationId) return <div style={{ padding: 24 }}>Select an application to view documents.</div>; if(loading) return <div style={{padding:24}}>Loading documents…</div>; if(error) return <div style={{padding:24,color:"#b91c1c"}}>{error}</div>;
  return <div style={{padding:24}}><h2>Documents</h2>{grouped.map(([id,g])=><details key={id} open><summary>{g.label} ({g.docs.length})</summary>{g.docs.map(d=><div key={d.documentId}>{d.filename??d.title??"(untitled)"} · {fmtDate(d.createdAt)} · {fmtSize(d.size)}</div>)}</details>)}</div>;
}
function fmtSize(bytes:number|null){ if(!bytes||bytes<=0) return "—"; if(bytes<1024) return `${bytes} B`; if(bytes<1024*1024) return `${Math.round(bytes/1024)} KB`; return `${(bytes/(1024*1024)).toFixed(1)} MB`; }
function fmtDate(v:string|null){ if(!v) return "—"; const d=new Date(v); return Number.isNaN(d.getTime())?"—":d.toLocaleDateString("en-CA",{year:"numeric",month:"short",day:"numeric"}); }
function groupByCategory(docs:DocumentRow[]){ const m=new Map<string,{label:string;docs:DocumentRow[]}>(); CATEGORY_GROUPS.forEach(g=>m.set(g.id,{label:g.label,docs:[]})); m.set("other",{label:"Other",docs:[]}); docs.forEach(doc=>{ const cat=(doc.category??"").toLowerCase(); const found=CATEGORY_GROUPS.find(g=>g.matchesCategory(cat)); m.get(found?.id??"other")!.docs.push(doc);}); return Array.from(m.entries()).filter(([,v])=>v.docs.length>0); }
