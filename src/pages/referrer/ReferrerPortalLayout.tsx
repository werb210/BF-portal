import { Navigate, Route, Routes } from "react-router-dom";
import ReferrerPortal from "@/pages/referrer/ReferrerPortal";
import ReferrerProfilePage from "@/pages/referrer/ReferrerProfilePage";

function hasToken() {
  return Boolean(sessionStorage.getItem("referrer_token"));
}

const ReferrerPortalLayout = () => {
  // REFERRER_SIGNUP_UI_v1 - first-time visitors see signup first; returning
  // partners tap "Log in" from there. (They cannot OTP-log-in until their
  // agreement is signed, so signup is the correct default landing.)
  if (!hasToken()) return <Navigate to="/referrer/signup" replace />;
  return (
    <Routes>
      <Route path="/" element={<ReferrerPortal />} />
      <Route path="/profile" element={<ReferrerProfilePage />} />
      <Route path="*" element={<Navigate to="/referrer" replace />} />
    </Routes>
  );
};

export default ReferrerPortalLayout;
