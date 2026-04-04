import api from "@/api";
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
export async function retry(fn, attempts = 3, delayMs = 500) {
    for (let i = 0; i < attempts; i += 1) {
        try {
            return await fn();
        }
        catch (error) {
            if (i === attempts - 1) {
                throw new Error("FAILED_AFTER_RETRY", { cause: error });
            }
            await wait(delayMs);
        }
    }
    throw new Error("FAILED_AFTER_RETRY");
}
export const getHumanSessions = async () => {
    const res = await retry(() => api.get("/chat/sessions", { params: { status: "human" } }));
    return res;
};
export const getMessages = async (sessionId) => {
    const res = await retry(() => api.get(`/chat/${sessionId}/messages`));
    return res;
};
export const sendStaffMessage = async (sessionId, message) => {
    const res = await api.post("/chat/message", {
        sessionId,
        message,
        role: "staff"
    });
    return res;
};
export const closeSession = async (sessionId) => {
    const res = await api.post("/chat/close", {
        sessionId
    });
    return res;
};
