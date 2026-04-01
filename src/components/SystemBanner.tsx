import { useApiStatusStore } from "@/state/apiStatus";

const SystemBanner = () => {
  const status = useApiStatusStore((state) => state.status);

  if (status === "unavailable") {
    return (
      <div className="api-status-banner" role="status">
        <strong>Server unavailable.</strong> Some data may be out of date. Please retry in a moment.
      </div>
    );
  }

  if (status === "degraded") {
    return (
      <div className="api-status-banner" role="status">
        <strong>System temporarily unavailable.</strong> Some features are operating in degraded mode.
      </div>
    );
  }

  if (status === "forbidden") {
    return (
      <div className="api-status-banner" role="status">
        <strong>Permission required.</strong> You do not have access to this resource.
      </div>
    );
  }

  return null;
};

export default SystemBanner;
