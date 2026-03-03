export type Silo = "BF" | "BI" | "SLF";

export function getSiloFromHost(): Silo {
  const host = window.location.hostname.toLowerCase();

  if (host.includes("bi")) return "BI";
  if (host.includes("slf")) return "SLF";
  return "BF";
}
