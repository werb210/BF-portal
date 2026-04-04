import { apiCall } from "@/lib/api";
export async function waitForServer() {
    for (let i = 0; i < 10; i++) {
        try {
            await apiCall("/ready");
            return true;
        }
        catch {
            // retry
        }
        await new Promise((r) => setTimeout(r, 500));
    }
    throw new Error("SERVER_NOT_READY");
}
