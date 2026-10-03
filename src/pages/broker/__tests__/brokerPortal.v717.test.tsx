// BF_PORTAL_BROKER_PORTAL_v717
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { readFileSync } from "node:fs";
const api=vi.fn();
vi.mock("@/api",()=>({api:(...a:unknown[])=>api(...a),rawApiFetch:vi.fn()}));
import { BrokerHome, stageLabel } from "../BrokerPortal";
const file=(o:Record<string,unknown>)=>({import_id:"i1",application_id:"a1",business_name:"Acme Ltd",zip_name:"acme.zip",import_status:"awaiting_client",stage:"In Review",created_at:"2026-10-01T00:00:00Z",boreal_pct:50,broker_pct:50,terms:null,split_status:"proposed",broker_counter_pct:null,payout_amount:null,payout_paid_on:null,...o});
beforeEach(()=>{api.mockReset();vi.spyOn(window,"confirm").mockReturnValue(true);sessionStorage.setItem("referrer_token","t");});
describe("broker portal",()=>{
 it("shows each file's stage and lets the broker accept Boreal's split",async()=>{api.mockImplementation(async(url:string)=>url.endsWith("/me")?{broker:{company:"Avance",name:"Jeremy"}}:url.endsWith("/files")?{files:[file({})]}:{ok:true});render(<MemoryRouter><BrokerHome/></MemoryRouter>);expect(await screen.findByText("Acme Ltd")).toBeTruthy();expect(screen.getByText("In Review")).toBeTruthy();fireEvent.click(screen.getByText("Accept"));await waitFor(()=>expect(api).toHaveBeenCalledWith("/api/broker/files/a1/split",expect.objectContaining({method:"POST",body:JSON.stringify({action:"accept"})})));});
 it("or counter with their own share",async()=>{api.mockImplementation(async(url:string)=>url.endsWith("/me")?{broker:{company:"Avance",name:"Jeremy"}}:url.endsWith("/files")?{files:[file({})]}:{ok:true});render(<MemoryRouter><BrokerHome/></MemoryRouter>);fireEvent.click(await screen.findByText("Propose a different split"));fireEvent.change(screen.getByLabelText("Your share %"),{target:{value:"60"}});fireEvent.click(screen.getByText("Send"));await waitFor(()=>expect(api).toHaveBeenCalledWith("/api/broker/files/a1/split",expect.objectContaining({body:JSON.stringify({action:"counter",broker_pct:60,note:""})})));});
 it("labels files waiting for the client",()=>expect(stageLabel({stage:"draft",import_status:"awaiting_client"})).toBe("Waiting for the client to sign in"));
 it("is reachable and uses broker kind",()=>{expect(readFileSync("src/App.tsx","utf8")).toContain('<Route path="/broker/*" element={<BrokerPortalRoutes />} />');expect(readFileSync("src/pages/referrer/ReferrerSignupPage.tsx","utf8")).toContain('{ ...form, kind: "broker" }');});
});
describe("staff side",()=>it("shows proposals and counters",()=>{const src=readFileSync("src/components/applications/BrokerDealPanel.tsx","utf8");expect(src).toContain('deal.status==="countered"');expect(src).toContain("waiting for the broker to accept in the broker portal");}));
