import { QueryClient } from "@tanstack/react-query";
export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: false,
            refetchOnWindowFocus: false,
            refetchOnMount: false,
        },
        mutations: {
            retry: false,
        },
    },
});
