import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (count, err: any) => {
        if (err?.message === "AUTH_REQUIRED") return false;
        return count < 2;
      },
      refetchOnWindowFocus: false,
      refetchOnMount: false,
    },
    mutations: {
      retry: false,
    },
  },
});

