import { Navigate, Route, Routes } from "react-router-dom";
import ReferrerPortal from "@/pages/referrer/ReferrerPortal";

const ReferrerPortalLayout = () => {
  return (
    <Routes>
      <Route path="/" element={<ReferrerPortal />} />
      <Route path="*" element={<Navigate to="/referrer" replace />} />
    </Routes>
  );
};

export default ReferrerPortalLayout;
