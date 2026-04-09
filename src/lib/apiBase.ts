import { getSilo } from "./silo";

export function getApiBase() {
  const silo = getSilo();

  switch (silo) {
    case "bi":
      return "https://bi-server.boreal.financial";
    case "slf":
      return "https://slf-server.boreal.financial";
    default:
      return "https://server.boreal.financial";
  }
}
