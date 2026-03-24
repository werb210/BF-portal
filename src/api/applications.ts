import { apiRequest } from "@/lib/api";

export const getApplications = () =>
  apiRequest("/applications");

export const createApplication = (data: any) =>
  apiRequest("/applications", {
    method: "POST",
    body: JSON.stringify(data),
  });
