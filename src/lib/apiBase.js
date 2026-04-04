import { getSilo } from "./silo";
export function getApiBase() {
    const silo = getSilo();
    switch (silo) {
        case "BI":
            return "https://bi-server.boreal.financial";
        case "SLF":
            return "https://slf-server.boreal.financial";
        default:
            return "https://server.boreal.financial";
    }
}
