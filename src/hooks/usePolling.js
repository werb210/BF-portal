import { useEffect } from "react";
export function usePolling(callback, interval = 30000) {
    useEffect(() => {
        const id = setInterval(callback, interval);
        return () => clearInterval(id);
    }, [callback, interval]);
}
