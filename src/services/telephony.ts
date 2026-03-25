import { Contracts } from "@/lib/contracts";
import { requestWithContract } from "@/lib/contractsApi";

export async function getTelephonyToken() {
  const result = await requestWithContract(Contracts.telephonyToken, {
    method: "GET",
  });

  return result.token;
}
