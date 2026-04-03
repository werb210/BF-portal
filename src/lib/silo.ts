export type Silo = "BF" | "BI" | "SLF";

export function getSilo(): Silo {
  const host = window.location.hostname.toLowerCase();

  if (host.includes("insurance")) return "BI";
  if (host.includes("slf")) return "SLF";

  return "BF";
}
