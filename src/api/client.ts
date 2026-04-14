export { api as default, apiFetch } from "@/api/index";

import { api } from "@/api/index";

export const apiClient = {
  get: api.get,
  post: api.post,
  patch: api.patch,
  put: api.put,
  delete: api.delete,
};
