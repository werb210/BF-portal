export const API_BASE =
  import.meta.env.VITE_API_BASE ||
  import.meta.env.VITE_API_URL ||
  window?.__ENV?.API_BASE ||
  "";
