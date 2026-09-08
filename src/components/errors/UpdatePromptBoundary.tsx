import type React from "react";
import ErrorBoundary from "@/components/system/ErrorBoundary";

const UpdatePromptFallback = () => (
  <div className="update-banner" role="status" aria-live="polite">
    <span>Update temporarily unavailable. Please refresh later.</span>
  </div>
);

const UpdatePromptBoundary = ({ children }: { children: React.ReactNode }) => {
  return (
    <ErrorBoundary fallback={<UpdatePromptFallback />}>
      {children}
    </ErrorBoundary>
  );
};

export default UpdatePromptBoundary;
