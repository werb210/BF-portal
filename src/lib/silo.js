export function getSilo() {
    const host = window.location.hostname.toLowerCase();
    if (host.includes("insurance"))
        return "BI";
    if (host.includes("slf"))
        return "SLF";
    return "BF";
}
