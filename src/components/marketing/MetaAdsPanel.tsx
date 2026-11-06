// BF_PORTAL_v909_META_ADS - Marketing > Ads > Meta. BF-Server has no Meta (Facebook / Instagram) connection yet, so this
// tab shows what connecting it involves, instead of empty figures. When the server gains Meta lead-form and campaign
// reporting, this panel is where they appear.
const box = { padding: 16, border: "1px solid var(--ui-border)", borderRadius: 12, background: "var(--ui-surface-strong)", color: "var(--ui-text)" } as const;

export const META_SETUP_STEPS: string[] = [
  "In Meta Business Suite (business.facebook.com), make sure Boreal's Facebook Page and ad account are in Boreal's business portfolio, and that you are an admin of both.",
  "In Meta for Developers (developers.facebook.com), create a Business app for Boreal and add the Webhooks and Marketing API products.",
  "Give the app the leads_retrieval, pages_manage_metadata, pages_show_list and ads_read permissions, and generate a long-lived Page access token for Boreal's Page.",
  "Subscribe the Page to the leadgen webhook, pointing at BF-Server (this connection still has to be built on the server).",
  "Send the app id, app secret and Page token to whoever maintains BF-Server so they can be stored as server settings. Never paste them into chat or email.",
];

export default function MetaAdsPanel() {
  return (
    <section style={box} data-testid="meta-ads-setup">
      <h3 style={{ margin: "0 0 6px", fontSize: 16 }}>Meta (Facebook and Instagram)</h3>
      <div role="status" style={{ padding: "8px 12px", borderRadius: 8, background: "#fef3c7", color: "#78350f", border: "1px solid #fcd34d", fontSize: 13, marginBottom: 10 }}>
        <strong>Not connected.</strong> Meta lead-form leads and campaign figures are not coming into the CRM yet: the server has no Meta connection.
      </div>
      <p style={{ fontSize: 13, color: "var(--ui-text)", margin: "0 0 8px" }}>What connecting Meta takes:</p>
      <ol style={{ margin: 0, paddingLeft: 20, fontSize: 13, lineHeight: 1.6 }}>
        {META_SETUP_STEPS.map((s) => <li key={s}>{s}</li>)}
      </ol>
      <p style={{ fontSize: 13, color: "var(--ui-text-muted)", margin: "10px 0 0" }}>
        Once it is connected, each Meta lead becomes a contact here (with its campaign and form), and this tab shows spend, leads and cost per lead by campaign.
      </p>
    </section>
  );
}
