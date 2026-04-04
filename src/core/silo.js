export function getSiloFromHost() {
    const host = window.location.hostname.toLowerCase();
    if (host.includes("bi"))
        return "BI";
    if (host.includes("slf"))
        return "SLF";
    return "BF";
}
