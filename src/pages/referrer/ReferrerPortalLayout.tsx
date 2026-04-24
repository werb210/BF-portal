import { Navigate, Route, Routes } from "react-router-dom";
import ReferrerPortal from "@/pages/referrer/ReferrerPortal";
import ReferrerProfilePage from "@/pages/referrer/ReferrerProfilePage";

function hasToken() {
  return Boolean(sessionStorage.getItem("referrer_token"));
}

const ReferrerPortalLayout = () => {
  if (!hasToken()) return <Navigate to="/referrer/login" replace />;
  return (
    <Routes>
      <Route path="/" element={<ReferrerPortal />} />
      <Route path="/profile" element={<ReferrerProfilePage />} />
      <Route path="*" element={<Navigate to="/referrer" replace />} />
    </Routes>
  );
};

export default ReferrerPortalLayout;
