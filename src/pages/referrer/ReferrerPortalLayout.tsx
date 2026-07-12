import { Navigate, Route, Routes } from "react-router-dom";
import ReferrerPortal from "@/pages/referrer/ReferrerPortal";
import ReferrerProfilePage from "@/pages/referrer/ReferrerProfilePage";
import logoUrl from "@/assets/logo-boreal-mountains-white.svg";

// BF_PORTAL_REFERRER_BRAND_HEADER_v1 - the referrer portal had no branding at
// all. Match the BF client-app header: dark navy bar, white mountain mark,
// wordmark beside it. Wraps every referrer route (portal + profile).
function ReferrerBrandHeader() {
  return (
    <header
      style={{
        background: "#0d1626",
        borderBottom: "1px solid rgba(255,255,255,.08)",
        padding: "14px 20px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          maxWidth: 1400,
          margin: "0 auto",
        }}
      >
        <img src={logoUrl} alt="Boreal" style={{ height: 34, width: "auto", flexShrink: 0 }} />
        <span
          style={{
            color: "#fff",
            fontSize: 19,
            fontWeight: 700,
            letterSpacing: "-.01em",
            lineHeight: 1.2,
          }}
        >
          Boreal Group of Companies
        </span>
      </div>
    </header>
  );
}

function hasToken() {
  return Boolean(sessionStorage.getItem("referrer_token"));
}

const ReferrerPortalLayout = () => {
  // REFERRER_SIGNUP_UI_v1 - first-time visitors see signup first; returning
  // partners tap "Log in" from there. (They cannot OTP-log-in until their
  // agreement is signed, so signup is the correct default landing.)
  if (!hasToken()) return <Navigate to="/referrer/signup" replace />;
  return (
    <>
      <ReferrerBrandHeader />
      <Routes>
        <Route path="/" element={<ReferrerPortal />} />
        <Route path="/profile" element={<ReferrerProfilePage />} />
        <Route path="*" element={<Navigate to="/referrer" replace />} />
      </Routes>
    </>
  );
};

export default ReferrerPortalLayout;
