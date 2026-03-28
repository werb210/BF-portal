import { useEffect } from "react";
import apiClient from "@/api/httpClient";
import { ApiError } from "@/api/http";
import { useApiStatusStore } from "@/state/apiStatus";

export const useApiHealthCheck = () => {
  const setStatus = useApiStatusStore((state) => state.setStatus);

  useEffect(() => {
    let isActive = true;

    const checkHealth = async () => {
      try {
        await apiClient.get("/health", { skipAuth: true });
        if (isActive) {
          setStatus("available");
        }
      } catch (error) {
        if (!isActive) return;
        if (error instanceof ApiError && error.status === 401) {
          setStatus("unauthorized");
        } else {
          setStatus("unavailable");
        }
      }
    };

    checkHealth();

    return () => {
      isActive = false;
    };
  }, [setStatus]);
};
