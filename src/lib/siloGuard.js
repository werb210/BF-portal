import { getSilo } from "./silo";
export function assertSilo(data) {
    const silo = getSilo();
    if (!data)
        return;
    if (Array.isArray(data)) {
        data.forEach(assertSilo);
        return;
    }
    if (typeof data !== "object")
        return;
    const record = data;
    if (typeof record.silo === "string" && record.silo !== silo) {
        throw new Error("🚨 CROSS-SILO DATA BLOCKED");
    }
}
