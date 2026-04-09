export type Silo = "bf" | "bi" | "slf";

export function getSilo(): Silo {
  const host = window.location.hostname.toLowerCase();

  if (host.includes("insurance")) return "bi";
  if (host.includes("slf")) return "slf";

  return "bf";
}
