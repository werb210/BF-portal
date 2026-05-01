// BF_PORTAL_BLOCK_1_28B_TAB_CONTENT_REBUILD
import { useEffect, useState } from "react";
import { api } from "@/utils/api";
interface Props { applicationId?: string; }
type Doc = { category: string | null };
export default function FinancialsTab({ applicationId }: Props) {
  const [hasFinancialDocs, setHasFinancialDocs] = useState<boolean | null>(null);
  useEffect(() => { if(!applicationId) return; api<{documents?:Doc[]}>(`/api/portal/applications/${applicationId}`).then(r=>{const docs=Array.isArray(r?.documents)?r.documents:[]; setHasFinancialDocs(docs.some(d=>/financial|income|p_?l|profit|balance/i.test(d.category??"")));}).catch(()=>setHasFinancialDocs(false)); }, [applicationId]);
  if (!applicationId) return <div style={{ padding: 24 }}>Select an application to view financials.</div>;
  return <div style={{padding:24}}><h2>Financials</h2><p>OCR-extracted financial summary from uploaded documents</p><div>{hasFinancialDocs===null?"Checking financial documents…":hasFinancialDocs?"Financial documents detected. Processing in progress until Block 1.30 extraction is available.":"No financial documents on file. Upload P&L, Balance Sheet, and Cash Flow in Documents tab."}</div></div>;
}
