// BF_PORTAL_BLOCK_v311_MARKETING_CONSOLIDATE_v1 — the A/T split
// lives inside MarketingT (its internal view-toggle scopes data to
// Andrew's owner). The previous outer wrapper that toggled
// MarketingT vs a separate MarketingA stub was duplicating the
// heading and gating real users behind an empty placeholder.
// Now BIMarketing just renders MarketingT directly.
import MarketingT from "./MarketingT";

export default function BIMarketing() {
  return <MarketingT />;
}
