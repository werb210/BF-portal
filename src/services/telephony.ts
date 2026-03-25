import { Contracts } from "bf-contracts";
import { requestWithContract } from "@/lib/contractsApi";

export const getTelephonyToken = async () =>
  requestWithContract(Contracts.telephonyToken, { method: "GET" });
